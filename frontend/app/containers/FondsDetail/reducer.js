import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { cata, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestError, RequestLoading, RequestResults, } from 'alleycat-js/es/fetch'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  fondsDetailFetch,
  fondsDetailFetchCompleted,
} from './actions'

import { reducer, } from '../../common'

export const initialState = {
  fonds: RequestInit,
}

const reducerTable = makeReducer (
  fondsDetailFetch, (_) => assoc (
    'fondsDetail', RequestLoading (Nothing),
  ),
  fondsDetailFetchCompleted, (rcomplete) => assoc (
    'fondsDetail', rcomplete | cata ({
      RequestCompleteError: (e) => RequestError (e),
      RequestCompleteSuccess: (results) => RequestResults (results),
    }),
  ),
)

export default reducer ('FondsDetail', initialState, reducerTable)
