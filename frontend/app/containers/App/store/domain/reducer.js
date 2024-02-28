import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { cata, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  fondsenFetchCompleted,
  halt,
} from '../../actions/main'

import { reducer, } from '../../../../common'

export const initialState = {
  // --- `error=true` means the reducer is totally corrupted and the app should halt.
  error: false,
  fondsen: RequestInit,
}

const reducerTable = makeReducer (
  halt, () => assoc('error', true),
  fondsenFetchCompleted, (rcomplete) => assoc (
    'fondsen', rcomplete | cata ({
      RequestCompleteError: (e) => RequestError (e),
      RequestCompleteSuccess: (results) => RequestResults (results),
    }),
  ),
)

export default reducer ('domain', initialState, reducerTable)
