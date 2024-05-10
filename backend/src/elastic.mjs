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
import { decorateAndReject, eachP, inspect, retryPDefaultMessage, thenWhenTrue, mapX, ifLengthOne, regexAlphaNumSpace, stripNonAlphaNum, tapWhen, } from './util.mjs'

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
  normalizer: 'my_normalizer',
}

let esClient

// --- this is just a manual custom filter which does the same as the filter
// 'dutch' (see elastic docs), but it lets us tweak things.
const customDutchFilter = {
  dutch_stop: {
    type:       'stop',
    stopwords:  '_dutch_',
  },
  dutch_stop_extra: {
    type:       'stop',
    stopwords:  ['t'],
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
    'dutch_stop',
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
        regios: keywordMapping,
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
    'werk_regio',
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

const mkSearchQuery = (query, searchFilters, filterValues) => {
  const { categories, trefwoorden, } = searchFilters

  return query
    | stripNonAlphaNum
    | trim
    | split (/\s+/)
    | ifLengthOne (
      () => ({
        query: {
          bool: {
            minimum_should_match: 1,
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
              // --- @todo this is 'Lokaal', 'Internationaal', etc.; how useful is that?
              { match: { werk_regio: { query, }}},
              { match: { regios: { query, }}},
            ],
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
                ],
              },
            },
          },
        },
        // @todo
        // aggregations: categories_aggregations
        aggregations: {
          "categories": {
            terms: { field: "categories" }
          },
          "trefwoorden": {
            terms: { field: "trefwoorden" }
          }
        }
      }),
      (words) => ({
        // --- for multiple words we assemble the Lucene query manually (not clear
        // how to do what we want using the Elastic Query DSL)
        q: mkSearchLuceneQuery (words) | tapWhen (
          () => inspectLuceneQuery,
          logWith ('lucene query:'),
        ),
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
        werk_regio: {},
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
