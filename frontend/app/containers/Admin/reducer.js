import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { cata, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  usersFetchCompleted,
} from '../App/actions/main'

import { reducer, } from '../../common'

export const initialState = {
  users: RequestInit,
}

const reducerTable = makeReducer (
  usersFetchCompleted, (rcomplete) => assoc (
    'users', rcomplete | cata ({
      RequestCompleteError: (e) => RequestError (e),
      RequestCompleteSuccess: (results) => RequestResults (results),
    }),
  )
)

export default reducer ('Admin', initialState, reducerTable)
