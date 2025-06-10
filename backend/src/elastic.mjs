import {
  pipe, compose, composeRight,
  tap, map, ok, not, path, join, prop,
  invoke, split, lets, id,
} from 'stick-js/es'

import { Client, } from '@elastic/elasticsearch'

import { info, warn, } from 'alleycat-js/es/io'

import { recover, then, startP, rejectP, } from 'alleycat-js/es/async'
import { flatMap, } from 'alleycat-js/es/bilby'
import { logWith, trim, } from 'alleycat-js/es/general'
import { ifEquals, } from 'alleycat-js/es/predicate'
import { decorateAndReject, eachP, inspect, retryPDefaultMessage, thenWhenTrue, mapX, ifNotLengthOne, regexAlphaNumSpace, stripNonAlphaNum, tapWhen, setDeleteNM, } from './util.mjs'

// --- how many unique buckets to return per filter. The Elastic docs recommend 1000 as a general
// limit so this is quite high. But we have more than 1000 funds and want to try to show the entire
// list of unique values for naam_organsatie. Note that if the number exceeds FILTER_VALUE_COUNT
// then the list will be truncated.
const FILTER_VALUE_COUNT = 2000

const STOP_DUTCH = new Set ([
  't', 'de', 'en', 'van', 'ik', 'te', 'dat', 'die', 'in', 'een', 'hij', 'het', 'niet',
  'zijn', 'is', 'was', 'op', 'aan', 'met', 'als', 'voor', 'had', 'er',
  'maar', 'om', 'hem', 'dan', 'zou', 'of', 'wat', 'mijn', 'men', 'dit',
  'zo', 'door', 'over', 'ze', 'zich', 'ook', 'tot', 'je', 'mij', 'uit',
  'der', 'daar', 'naar', 'heb', 'hoe', 'heeft', 'hebben', 'deze', 'u', 'nog',
  'zal', 'me', 'zij', 'nu', 'ge', 'geen', 'omdat', 'iets', 'worden', 'toch',
  'al', 'veel', 'doen', 'toen', 'moet', 'ben', 'zonder', 'kan', 'hun', 'dus',
  'alles', 'onder', 'ja', 'eens', 'hier', 'wie', 'werd', 'altijd', 'doch', 'wordt',
  'kunnen', 'ons', 'zelf', 'tegen', 'na',
  // --- these are words which we usually want to ignore, but this can be altered below
  // if we want to un-ignore them (e.g. wezen for orphans, bij voor bee, meer voor lake)
  'bij', 'haar', 'want', 'waren', 'meer', 'wezen',
])
STOP_DUTCH | setDeleteNM ([
  'wezen', 'doen',
])

// --- debug / analyze
const analyze = false
const analyzeText = `
Het Joods Jongerenfonds (JJF) oftewel 't Fonds dat gaat over het boek van taken en nog een taak met Dhr. Vos en Zoon
Het optimaliseren van het welzijn van werknemers in de gehele supply chain is een sleutelonderdeel van klanttevredenheid.
`
const inspectResultsAutocomplete = false
const inspectResultsSearch = false
const inspectLuceneQuery = false

const indexMain = 'main'

export const highlightTags = [
  // --- U+185D
  '_ᡝᡝᡝ_',
  '_ᡝᡝᡝ_',
]

const keywordMapping = {
  type: 'keyword',
  normalizer: null,
}

let esClient

// --- this is just a manual custom filter which does the same as the filter
// 'dutch' (see elastic docs), but it lets us tweak things.
const customDutchFilter = {
  dutch_stop_extra: {
    type:       'stop',
    stopwords:  [... STOP_DUTCH],
  },
  dutch_keywords: {
    type:       'keyword_marker',
    // --- what does this do?
    keywords:   ['voorbeeld'] ,
  },
  dutch_stemmer: {
    type:       'stemmer',
    language:   'dutch',
  },
  dutch_override: {
    type:       'stemmer_override',
    rules: [
      'fiets=>fiets',
      'bromfiets=>bromfiets',
      'ei=>eier',
      'kind=>kinder',
    ],
  },
}

// --- just for testing ('standard' works really well)
const customTokenizers = {
  customWordTokenizer: {
    type: 'simple_pattern',
    pattern: '\\w+',
  },
}

// --- ditto custom filter for Dutch
const customDutchAnalyzer = {
  tokenizer: 'standard',
  filter: [
    'lowercase',
    // 'dutch_stop',
    'dutch_stop_extra',
    'dutch_keywords',
    'dutch_override',
    'dutch_stemmer'
  ],
}

export const init = (url, data, { forceReindex=false, }={}, ) => {
  esClient = new Client ({ node: url, })
  return waitConnection () | then (
    () => mkIndex (indexMain, initIndexMain, forceReindex, data),
  )
}

const mkIndex = (index, initIndex, forceReindex, data) => startP ()
  | then (() => esClient.indices.exists ({ index, }))
  | recover (decorateAndReject ('Error with esClient.indices.exists for ' + index + ' : '))
  | then ((exists) => {
    if (exists && !forceReindex) return false
    if (exists) return esClient.indices.delete ({ index, })
      | recover (decorateAndReject ('Error with esClient.indices.delete for ' + index + ' : '))
      | then (() => true)
    else return true
  })
  | then ((doInit) => {
    if (!doInit) return
    return initIndex (data)
  })

const initIndexMain = (data) => startP ()
  | then (() => info ('building main index'))
  | then (() => esClient.indices.create ({
    index: indexMain,
    settings: {
      analysis: {
        filter: customDutchFilter,
        tokenizer: customTokenizers,
        analyzer: {
          default: customDutchAnalyzer,
        },
        normalizer: {
          // --- we ended up not using this (this is where it gets defined, mappings.properties is
          // where it gets enabled).
          my_normalizer: {
            type: "custom",
            filter: ["lowercase", "asciifolding"]
          }
        }
      },
    },
    mappings: {
      properties: {
        doelstelling: { type: 'text', },
        categories: keywordMapping,
        trefwoorden: keywordMapping,
        werkterreinen_geografisch: keywordMapping,
        naam_organisatie: {
          type: 'text',
          fields: {
            keyword: keywordMapping,
          },
        }
      },
    },
  }))
  | recover (decorateAndReject ('Error with esClient.indices.create for ' + indexMain + ' : '))
  | thenWhenTrue (analyze) (() => esClient.indices.analyze ({
    index: indexMain,
    text: analyzeText,
  }) | then (logWith ('analysis: ')))
  | then (
    () => data | eachP ((fonds) => {
      return esClient.index ({
        index: indexMain,
        // --- @future we could save memory by only indexing the fields we
        // will eventually search/autocomplete on
        document: fonds,
      })
    })
    | recover (decorateAndReject ('Error with indexing'))
  )
  | then (() => info ('done building main index'))

const mkSearchLuceneQuery = invoke (() => {
  // --- must match the fields in `mkSearchQuery`
  const fields = [
    // @todo slightly weird that categories is english and the other fields are dutch
    'categories',
    'doelgroep',
    'doelstelling',
    'naam_organisatie',
    'type_organisatie',
    'werkterreinen_geografisch',
  ]
  // --- for e.g. 'jongeren verbinding' we want:
  // +(field1:jongeren field2:jongeren ...) +(field1:verbinding field2:verbinding ...)
  return (words) => words
    | map ((word) => join (' ', fields | map (
      (field) => field + ':' + word,
    )))
    | map ((clause) => '+(' + clause + ')')
    | join (' ')
})

const _mkSearchQuery = (query, searchFilters, filterValues) => ({
  analyze_wildcard: true,
  q: '*:*',
  aggregations: {
    "categories": {
      terms: { field: "categories" }
    },
    "trefwoorden": {
      terms: { field: "trefwoorden" }
    },
  },
})

const mkSearchQuery = (query, searchFilters, filterValues) => {
  const { categories, trefwoorden, naam_organisatie, werkterreinen_geografisch, } = searchFilters
  const size = FILTER_VALUE_COUNT
  const aggregations = {
    categories: {
      terms: { size, field: 'categories', },
    },
    trefwoorden: {
      terms: { size, field: 'trefwoorden', },
    },
    naam_organisatie: {
      // --- @todo should this maybe use the fulltext variant and not the keyword?
      // --- @todo shouldn't these 4 either all use keyword or all use fulltext?
      terms: { size, field: 'naam_organisatie.keyword', },
    },
    werkterreinen_geografisch: {
      terms: { size, field: 'werkterreinen_geografisch', },
    },
  }

  const queryClause = query | ifEquals ('*') (
    () => ({
      should: {
        match_all: {},
      },
    }),
    () => ({
      // --- i.e., group phrases together using OR
      should: [
        { match: { categories: { query, }}},
        // --- we need to use full-text queries (`match` etc.) and not
        // term-level queries (`term` etc.) because of the stemming &
        // tokenizing and so on which we do for Dutch.
        { match: { doelgroep: { query, }}},
        { match: { doelstelling: { query, }}},
        { match: { naam_organisatie: { query, }}},
        { match: { trefwoorden: { query, }}},
        { match: { type_organisatie: { query, }}},
        { match: { werkterreinen_geografisch: { query, }}},
      ],
    }),
  )

  return query
    | stripNonAlphaNum
    | trim
    | split (/\s+/)
    | ifNotLengthOne (
      // --- for multiple words we assemble the Lucene query manually (not clear how to do what we
      // want using the Elastic Query DSL)
      // --- @todo: doing it this way means we can't do text analysis or use the built-in filter
      // feature
      (words) => ({
        aggregations,
        q: mkSearchLuceneQuery (words) | tapWhen (
          () => inspectLuceneQuery,
          logWith ('lucene query:'),
        ),
      }),
      () => ({
        aggregations,
        query: {
          bool: {
            minimum_should_match: 1,
            ... queryClause,
            filter: {
              bool: {
                must: [
                  {
                    bool: {
                      should: categories | map ((categorie) => ({
                        term: { categories: categorie, },
                      })),
                    }
                  },
                  {
                    bool: {
                      should: trefwoorden | map ((trefwoord) => ({
                        term: { trefwoorden: trefwoord, },
                      })),
                    }
                  },
                  {
                    bool: {
                      should: werkterreinen_geografisch | map ((werkterrein) => ({
                        term: { werkterreinen_geografisch: werkterrein, },
                      })),
                    }
                  },
                  {
                    bool: {
                      should: naam_organisatie | map ((naam) => ({
                        term: { 'naam_organisatie.keyword': naam, },
                      })),
                    }
                  },
                ],
              },
            },
          },
        },
      }),
    )
}

export const search = (query, searchFilters, pageSize, pageNum, doHighlightDoelstelling=true, filterValues) => startP ()
  | then (() => esClient.search ({
    index: indexMain,
    size: pageSize,
    from: pageNum * pageSize,
    ... mkSearchQuery (query, searchFilters, filterValues),
    highlight: {
      pre_tags: highlightTags [0],
      post_tags: highlightTags [1],
      // --- because we want to be able to use the returned contents in
      // `highlight` as the value of the field (and so be sure not to lose
      // any text).
      number_of_fragments: 0,
      fields: {
        // --- we highlight `categories` manually for now (it's an
        // array and that presents some difficulties)
        // --- @future use elastic mappings?
        doelgroep: {},
        ... doHighlightDoelstelling ? { doelstelling: {}, } : {},
        naam_organisatie: {},
        trefwoorden: {},
        type_organisatie: {},
      },
    },
  }))
  | thenWhenTrue (inspectResultsSearch) (tap (inspect >> logWith ('results for search')))
  | then (({ hits: { total: { value: numHits }, hits }, aggregations }) => ({ hits, numHits, aggregations, }))
  | recover (decorateAndReject ('Error with esClient.search: '))

export const searchPhrasePrefixNoContext = (max, query) => {
  const numWords = (query.match (/\S+/g) ?? []).length
  return startP ()
  | then (() => esClient.search ({
    index: indexMain,
    // --- don't include the whole source document in result
    _source: false,
    // --- can include these in result, but not necessary if all we want is
    // the matched value, which we extract using highlight
    // fields: ['doelstelling', 'naam_organisatie'],
    query: {
      // --- combine using OR
      bool: {
        should: [
          // --- `match_phrase` is like `match` for single words, but if a
          // phrase is entered it matches the whole phrase instead of doing
          // OR on the words; also the last word of the phrase can be
          // partial.
          { prefix: { categories: query, }},
          { match_phrase_prefix: { doelgroep: query, }},
          { match_phrase_prefix: { doelstelling: query, }},
          { match_phrase_prefix: { naam_organisatie: query, }},
          { prefix: { trefwoorden: query, }},
          { match_phrase_prefix: { type_organisatie: query, }},
        ],
      },
    },
    // --- ideally this would just be `max`, but there may be a lot of
    // duplicates.
    size: max * 3,
    highlight: {
      // --- this means the highlight field will contain exactly the
      // term/phrase that was matched.
      fragment_size: numWords,
      pre_tags: '',
      post_tags: '',
      fields: {
        '*': {},
      },
    },
  }))
  | thenWhenTrue (inspectResultsAutocomplete) (tap (inspect >> logWith ('results for autocomplete')))
  // --- @future it would be more efficient to have elastic return unique
  // values -- this should be possible with aggregations
  | then (({ hits: { hits, }}) => hits)
  | recover (decorateAndReject ('Error with esClient.search: '))
}

// --- e.g. for doelstelling and naam_organisatie
export const searchWithWildcards = (max, query) => {
  const fields = ['doelstelling', 'naam_organisatie']
  return startP ()
  | then (() => esClient.search ({
    index: indexMain,
    analyze_wildcard: true,
    q: join (' ', fields | map ((field) => field + ':' + query)),
    size: max,
  }))
  // --- e.g.
  | then (({ hits: { hits, }}) => hits | map (path (['_source', 'naam_organisatie'])))
}

// --- only here for reference -- the suggestions they give are way too general
export const suggest = (max, query) => startP ()
  | then (() => esClient.search ({
    index: indexMain,
    // --- we can omit query here since we only want suggestions
    suggest: {
      gotsuggest: {
        text: query,
        term: { field: 'doelstelling', },
      },
    },
    size: max,
  }))
  | then ((results) => results.suggest.gotsuggest | flatMap (
    (suggest) => suggest.options | map (prop ('text')),
  ))

// :: Promise Boolean
export const checkConnection = () => {
  info ("checking connection to ElasticSearch...")
  return startP ()
  | then (() => esClient.cluster.health ({}))
  | then ((results) => ok (results) && not (results.timed_out))
  | recover ((e) => warn ('Error with esClient.cluster.health: ', e))
}

const checkConnectionReject = () => checkConnection ()
  | then ((good) => good || rejectP ())

export const waitConnection = () => retryPDefaultMessage (
  'Unable to establish connection to elastic, trying again',
  warn,
  (retryN) => retryN < 3 ? 100 : retryN < 10 ? 500 : retryN < 15 ? 1000 : null,
  () => checkConnectionReject (),
)
