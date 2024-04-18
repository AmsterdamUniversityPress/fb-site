import {
  pipe, compose, composeRight,
  tap, map, ok, not, path, join, prop,
} from 'stick-js/es'

import { Client, } from '@elastic/elasticsearch'

import { info, warn, } from 'alleycat-js/es/io'

import { recover, then, startP, rejectP, } from 'alleycat-js/es/async'
import { flatMap, } from 'alleycat-js/es/bilby'
import { logWith, } from 'alleycat-js/es/general'
import { decorateAndReject, eachP, inspect, retryPDefaultMessage, thenWhenTrue, } from './util.mjs'

// --- debug / analyze
const analyze = false
const analyzeText = `Het Joods Jongerenfonds (JJF) oftewel 't Fonds dat gaat over het boek van taken en nog een taak met Dhr. Vos en Zoon`
const inspectResults = false

const indexMain = 'main'

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
      },
    },
  }))
  | recover (decorateAndReject ('Error with esClient.indices.create for ' + indexMain + ' : '))
  | thenWhenTrue (analyze) (() => esClient.indices.analyze ({
    index: indexMain,
    text: analyzeText,
  }) | then (logWith ('analysis: ')))
  | then (
    () => data | eachP ((fonds) => esClient.index ({
      index: indexMain,
      document: fonds,
    }))
    | recover (decorateAndReject ('Error with indexing'))
  )
  | then (() => info ('done building main index'))

export const search = (query, pageSize, pageNum) => startP ()
  | then (() => esClient.search ({
    index: indexMain,
    size: pageSize,
    from: pageNum * pageSize,
    query: {
      bool: {
        // --- i.e., 'OR'
        should: [
          { term: { categories: query, }},
          { term: { doelgroep: query, }},
          { term: { doelstelling: query, }},
          { term: { naam_organisatie: query, }},
          { term: { trefwoorden: query, }},
          { term: { type_organisatie: query, }},
        ],
      },
    },
    highlight: {
      pre_tags: '<span class="highlight">',
      post_tags: '</span>',
      fields: {
        categories: {},
        doelgroep: {},
        doelstelling: {},
        naam_organisatie: {},
        trefwoorden: {},
        type_organisatie: {},
      },
    },
  }))
  | then (({ hits: { hits, }}) => hits)
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
          // --- phrase search where the last word can be partial
          { match_phrase_prefix: { doelstelling: query, }},
          { match_phrase_prefix: { naam_organisatie: query, }},
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
  | thenWhenTrue (inspectResults) ((x) => x | tap (inspect >> logWith ('results')))
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
    // index: indexAutocomplete,
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
