import {
  pipe, compose, composeRight,
  sprintf1, sprintfN, die,
  map, tryCatch, id,
  ok, not,
} from 'stick-js/es'

import { Client, } from '@elastic/elasticsearch'

import { info, warn, } from 'alleycat-js/es/io'

import { recover, then, startP, rejectP, resolveP, } from 'alleycat-js/es/async'
import { decorateAndReject, eachP, tryCatchP, retryPDefaultMessage, } from './util.mjs'

const index = 'main'

let esClient

export const init = (url, data, { forceReindex=false, }={}, ) => {
  esClient = new Client ({ node: url, })
  return waitConnection ()
    | then (() => esClient.indices.exists ({ index, }))
    | recover (decorateAndReject ('Error with esClient.indices.exists: '))
    | then ((exists) => {
      if (exists && !forceReindex) return false
      if (exists) return esClient.indices.delete ({ index, })
        | recover (decorateAndReject ('Error with esClient.indices.delete: '))
        | then (() => true)
      else return true
    })
    | then ((doInit) => doInit && initIndex (data))
}

const initIndex = (data) => startP ()
  | then (() => info ('building index'))
  | then (() => esClient.indices.create ({ index, }))
  | recover (decorateAndReject ('Error with esClient.indices.create: '))
  | then (
    () => data | eachP ((fonds) => esClient.index ({
      index,
      id: fonds.uuid,
      document: fonds,
    }))
    | recover (decorateAndReject ('Error with indexing'))
  )
  | then (() => info ('done building index'))

export const search = (query) => startP ()
  | then (() => esClient.search ({
    query: {
      bool: {
        // --- i.e., or
        should: [
          { term: { doelstelling: query, }},
          { term: { doelgroep: query, }},
          { term: { categories: query, }},
          { term: { naam_organisatie: query, }},
          { term: { type_organisatie: query, }},
        ],
      },
    },
    highlight: {
      // --- @todo
      pre_tags: '<span class="highlight">',
      post_tags: '</span>',
      fields: {
        doelgroep: {},
        doelstelling: {},
        categories: {},
        naam_organisatie: {},
        type_organisatie: {},
      },
    },
  }))
  | recover (decorateAndReject ('Error with esClient.search: '))

// :: Promise Boolean
export const checkConnection = () => {
  info ("Checking connection to ElasticSearch...")
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
