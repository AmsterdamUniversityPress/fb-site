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
  sendResetEmail,
  sendResetEmailCompleted,
  setAllowAnalytical,
} from '../../actions/main'

import { reducer, } from '../../../../common'

const unique = () => Symbol ()

export const initialState = {
  allowAnalytical: null,
  emailRequestPending: false,
  emailRequestSuccess: unique (),
  userUser: RequestInit,
  userInstitution: RequestInit,
  // --- @todo make consistent (Maybe vs. RequestResults)
  userPrivileges: Nothing,
}

const reducerTable = makeReducer (
  setAllowAnalytical, (allow) => assoc (
    'allowAnalytical', allow,
  ),
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
    const [user, allowAnalytical, privileges] = rcomplete | cata ({
      RequestCompleteError: (e) => [RequestError (e), null, Nothing],
      RequestCompleteSuccess: (user) => user | ifOk (
        ({ userinfo, allowAnalytical, }) => [RequestResults (userinfo), allowAnalytical, Just (userinfo.privileges)],
        () => [RequestInit, null, Nothing],
      ),
    })
    return merge ({
      allowAnalytical,
      userUser: user,
      userPrivileges: privileges,
    })
  },
  loggedOutUser, () => merge ({
    allowAnalytical: false,
    userUser: RequestInit,
    userPrivileges: Nothing,
  }),
  sendResetEmail, (_email) => assoc (
    'emailRequestPending', true,
  ),
  sendResetEmailCompleted, ({ rcomplete, ... _ }) => composeRight (
    assoc ('emailRequestPending', false),
    rcomplete | cata ({
      RequestCompleteError: (_) => id,
      RequestCompleteSuccess: (_) => assoc ('emailRequestSuccess', unique ()),
    })
  ),
)

export default reducer ('app', initialState, reducerTable)
