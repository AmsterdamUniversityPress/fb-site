import {
  pipe, compose, composeRight,
  assoc, update, recurry,
} from 'stick-js/es'

import { cata, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  sendWelcomeEmail,
  sendWelcomeEmailCompleted,
  usersFetchCompleted,
} from '../App/actions/main'

import { reducer, } from '../../common'

export const initialState = {
  emailRequestLoading: new Set (),
  users: RequestInit,
}

const setRemove = recurry (2) (
  (x) => (s) => (s.delete (x), new Set (s)),
)
const setAdd = recurry (2) (
  (x) => (s) => new Set (s.add (x)),
)

const reducerTable = makeReducer (
  sendWelcomeEmail, (email) => update ('emailRequestLoading', setAdd (email)),
  sendWelcomeEmailCompleted, ({ email, ... _ }) => update ('emailRequestLoading', setRemove (email)),
  usersFetchCompleted, (rcomplete) => assoc (
    'users', rcomplete | cata ({
      RequestCompleteError: (e) => RequestError (e),
      RequestCompleteSuccess: (results) => RequestResults (results),
    }),
  )
)

export default reducer ('Admin', initialState, reducerTable)
