import {
  pipe, compose, composeRight,
  assoc, ifOk, tap, merge, id,
} from 'stick-js/es'

import { cata, Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestError, RequestLoading, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, logWith, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  loggedInInstitution,
  logIn,
  loginUserCompleted,
  loggedOutUser,
  sendWelcomeResetEmail,
  sendWelcomeResetEmailCompleted,
} from '../../actions/main'

import { reducer, } from '../../../../common'

const unique = () => Symbol ()

export const initialState = {
  emailRequestPending: false,
  emailRequestSuccess: unique (),
  userUser: RequestInit,
  userInstitution: RequestInit,
  // --- @todo make consistent (Maybe vs. RequestResults)
  userPrivileges: Nothing,
}

const reducerTable = makeReducer (
  loggedInInstitution, (user) => assoc (
    'userInstitution', RequestResults (user),
  ),
  // --- user null means error or not logged in -- we collapse both to mean 'not logged in' since
  // in the case of error we've already shown the oops bubble
  logIn, (_) => composeManyRight (
    assoc ('userUser', RequestLoading (Nothing)),
    assoc ('userPrivileges', Nothing),
  ),
  loginUserCompleted, (rcomplete) => {
    const [user, privileges] = rcomplete | cata ({
      RequestCompleteError: (e) => [RequestError (e), Nothing],
      RequestCompleteSuccess: (user) => user | ifOk (
        () => [RequestResults (user), Just (user.privileges)],
        () => [RequestInit, Nothing],
      ),
    })
    return composeManyRight (
      assoc ('userUser', user),
      assoc ('userPrivileges', privileges),
    )
  },
  loggedOutUser, () => merge ({
    userUser: RequestInit,
    userPrivileges: Nothing,
  }),
  sendWelcomeResetEmail, (_email) => assoc (
    'emailRequestPending', true,
  ),
  sendWelcomeResetEmailCompleted, ({ rcomplete, ... _ }) => composeRight (
    assoc ('emailRequestPending', false),
    rcomplete | cata ({
      RequestCompleteError: (_) => id,
      RequestCompleteSuccess: (_) => assoc ('emailRequestSuccess', unique ()),
    })
  ),
)

export default reducer ('app', initialState, reducerTable)
