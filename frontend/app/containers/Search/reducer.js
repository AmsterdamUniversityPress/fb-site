import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { trim, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import { queryUpdated, execute, executeCompleted, } from './actions'
import { ifIsEmptyString, rcompleteToResults, reducer, } from '../../common'

export const initialState = {
  query: Nothing,
  results: RequestInit,
}

// minor: this value is already trimmed in the component.
const reducerTable = makeReducer (
  queryUpdated, (query) => assoc ('query', query | trim | ifIsEmptyString (
    () => Nothing, Just,
  )),
  // execute, () => assoc ('results', RequestLoading (Nothing)),
  executeCompleted, (rcomplete) => assoc ('results', rcomplete | rcompleteToResults),
)

export default reducer ('Search', initialState, reducerTable)
