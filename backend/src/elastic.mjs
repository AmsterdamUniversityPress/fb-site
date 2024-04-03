import {
  pipe, compose, composeRight,
  sprintf1, sprintfN,
} from 'stick-js/es'

import { Client } from '@elastic/elasticsearch'

import { warn, } from 'alleycat-js/es/io'
import { decorateRejection, info, } from 'alleycat-js/es/general'

import { recover, then, } from 'alleycat-js/es/async'

const esClient = (url) => new Client({ node: url })

let esIndex

const mkIndexP = async (url, index) => esClient (url)
  .indices.create ({ index })
  | then ((index | sprintf1 | 'Created elasic index: %s') | info)
  | recover ((e) => warn (decorateRejection ('Error with elastic index: ', e)))

export const init = async (url, index) => {
  esIndex = await mkIndexP (url, index)
}


