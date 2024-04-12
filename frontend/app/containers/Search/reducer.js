import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, } from 'alleycat-js/es/general'

import { Just, Nothing, } from 'alleycat-js/es/bilby'
import { trim, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import { queryUpdated, execute, executeCompleted, } from './actions'
import { ifIsEmptyString, rcompleteToResults, reducer, } from '../../common'

export const initialState = {
  query: Nothing,
  results: RequestInit,
}

const reducerTable = makeReducer (
  queryUpdated, (query) => assoc ('query', query | trim | ifIsEmptyString (
    () => Nothing, Just,
  )),
  // execute, () => assoc ('results', RequestLoading (Nothing)),
  executeCompleted, (rcomplete) => assoc ('results', rcomplete | rcompleteToResults),
)

export default reducer ('Search', initialState, reducerTable)
