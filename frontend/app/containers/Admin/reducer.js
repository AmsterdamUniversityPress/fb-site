import {
  pipe, compose, composeRight,
  assoc, update, recurry, tap,
} from 'stick-js/es'

import { cata, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, logWith, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  sendWelcomeEmail,
  sendWelcomeEmailCompleted,
  usersFetchCompleted,
  userAdd,
  userAddCompleted,
  userAddStart,
  userRemove,
  userRemoveCompleted,
} from '../App/actions/main'

import { reducer, } from '../../common'

export const initialState = {
  emailRequestPending: new Set (),
  // --- we just want to keep track of the state of the request and don't care what's inside
  // RequestResults.
  userAddRequest: RequestInit,
  userRemovePendingUsers: new Set (),
  // --- ditto
  userRemoveRequest: RequestInit,
  users: RequestInit,
}

const setRemove = recurry (2) (
  (x) => (s) => (s.delete (x), new Set (s)),
)
const setAdd = recurry (2) (
  (x) => (s) => new Set (s.add (x)),
)

const reducerTable = makeReducer (
  sendWelcomeEmail, (email, _type) => update (
    'emailRequestPending', setAdd (email),
  ),
  sendWelcomeEmailCompleted, ({ email, ... _ }) => update (
    'emailRequestPending', setRemove (email),
  ),
  userAdd, (... _) => assoc (
    'userAddRequest', RequestLoading (Nothing),
  ),
  userAddCompleted, (rcomplete) => assoc (
    'userAddRequest', rcomplete | cata ({
      RequestCompleteError: (_) => RequestError (null),
      RequestCompleteSuccess: (_) => RequestResults (null),
    }),
  ),
  userAddStart, (... _) => assoc (
    'userAddRequest', RequestInit,
  ),
  userRemove, (email) => composeManyRight (
    update ('userRemovePendingUsers', setAdd (email)),
    assoc ('userRemoveRequest', RequestLoading (Nothing)),
  ),
  userRemoveCompleted, ({ rcomplete, email, }) => composeManyRight (
    update ('userRemovePendingUsers', setRemove (email)),
    assoc ('userRemoveRequest', rcomplete | cata ({
      RequestCompleteError: (_) => RequestError (null),
      RequestCompleteSuccess: (_) => RequestResults (null),
    })),
  ),
  usersFetchCompleted, (rcomplete) => assoc (
    'users', rcomplete | cata ({
      RequestCompleteError: (e) => RequestError (e),
      RequestCompleteSuccess: (results) => RequestResults (results),
    }),
  )
)

export default reducer ('Admin', initialState, reducerTable)
