import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { cata, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  halt,
  dataFetchCompleted,
} from '../../actions/main'

import { reducer, } from '../../../../common'

export const initialState = {
  // --- `error=true` means the reducer is totally corrupted and the app should halt.
  error: false,
  data: "start",
}

const reducerTable = makeReducer (
  halt, () => assoc('error', true),
  dataFetchCompleted, (rcomplete) => assoc (
    'data', rcomplete | cata ({
      RequestCompleteError: (_) => {},
      RequestCompleteSuccess: (results) => results,
    }),
  ),
)

export default reducer ('domain', initialState, reducerTable)
