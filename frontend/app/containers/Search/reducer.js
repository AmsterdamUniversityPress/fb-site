import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import {} from './actions'
import { reducer, } from '../../common'

export const initialState = {
}

const reducerTable = makeReducer (
  // counterIncrement, () => update ('counter', plus (1)),
)

export default reducer ('Search', initialState, reducerTable)
