import {
  pipe, compose, composeRight,
  assoc, ifOk, tap, merge, id,
} from 'stick-js/es'

import daggy from 'daggy'

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
  setPage,
} from '../../actions/main'

import { reducer, } from '../../../../common'
import { fold4, } from '../../../../util-general'

const LoginState = daggy.taggedSum ('LoginState', {
  LoginNotLoggedIn: [],
  LoginUnknown: [],
  LoginLoggedInUser: ['user'],
  LoginLoggedInInstitution: ['user'],
})

const { LoginNotLoggedIn, LoginUnknown, LoginLoggedInUser, LoginLoggedInInstitution, } = LoginState

LoginState.prototype.fold = function (f, g, h, i) {
  return this | cata ({
    LoginNotLoggedIn: () => f (),
    LoginUnknown: () => g (),
    LoginLoggedInUser: (user) => h (user),
    LoginLoggedInInstitution: (user) => i (user),
  })
}

export const loginStateFold = fold4

const unique = () => Symbol ()

export const initialState = {
  allowAnalytical: null,
  emailRequestPending: false,
  emailRequestSuccess: unique (),
  loginState: LoginUnknown,
  page: null,
  userUser: RequestInit,
  userInstitution: RequestInit,
  // --- @todo make consistent (Maybe vs. RequestResults)
  userPrivileges: Nothing,
}

const reducerTable = makeReducer (
  setAllowAnalytical, (allow) => assoc (
    'allowAnalytical', allow,
  ),
  loggedInInstitution, (user) => composeManyRight (
    assoc ('userInstitution', RequestResults (user)),
    assoc ('loginState', LoginLoggedInInstitution (user)),
  ),
  // --- user null means error or not logged in -- we collapse both to mean 'not logged in' since
  // in the case of error we've already shown the oops bubble
  logIn, (_) => composeManyRight (
    assoc ('userUser', RequestLoading (Nothing)),
    assoc ('userPrivileges', Nothing),
  ),
  loginUserCompleted, (rcomplete) => (state) => {
    const { loginState: loginStateCur, } = state
    const [user, allowAnalytical, privileges, loginState] = rcomplete | cata ({
      RequestCompleteError: (e) => [RequestError (e), null, Nothing, loginStateCur],
      RequestCompleteSuccess: (user) => user | ifOk (
        ({ userinfo, allowAnalytical, }) => [
          RequestResults (userinfo),
          allowAnalytical,
          Just (userinfo.privileges),
          LoginLoggedInUser (userinfo),
        ],
        () => [RequestInit, null, Nothing, LoginNotLoggedIn],
      ),
    })
    return state | merge ({
      allowAnalytical,
      loginState,
      userUser: user,
      userPrivileges: privileges,
    })
  },
  loggedOutUser, () => merge ({
    allowAnalytical: false,
    loginState: LoginNotLoggedIn,
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
  setPage, (page) => assoc ('page', page),
)

export default reducer ('app', initialState, reducerTable)
