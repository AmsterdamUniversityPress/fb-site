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
  // --- @todo make consistent (Maybe vs. RequestResults)
  userPrivileges: Nothing,
}

const reducerTable = makeReducer (
  setAllowAnalytical, (allow) => assoc (
    'allowAnalytical', allow,
  ),
  loggedInInstitution, (user) => assoc (
    'loginState', LoginLoggedInInstitution (user),
  ),
  logIn, (_) => assoc ('userPrivileges', Nothing),
  /* We get here in two ways: login action completed, or /hello call returned.
   * Error means login action failed with an error.
   * If /hello returns an error (usually 499, meaning not logged in), it gets caught in the saga and
   * converted to a success with user = `null`.
   */
  loginUserCompleted, (rcomplete) => (state) => {
    const { loginState: loginStateCur, } = state
    const [allowAnalytical, privileges, loginState] = rcomplete | cata ({
      // --- login with the form -- not /hello -- failed with an error.
      RequestCompleteError: (_) => [null, Nothing, loginStateCur],
      RequestCompleteSuccess: (user) => user | ifOk (
        ({ userinfo, allowAnalytical, }) => [
          allowAnalytical,
          Just (userinfo.privileges),
          LoginLoggedInUser (userinfo),
        ],
        () => [null, Nothing, LoginNotLoggedIn],
      ),
    })
    return state | merge ({
      allowAnalytical,
      loginState,
      userPrivileges: privileges,
    })
  },
  loggedOutUser, () => merge ({
    allowAnalytical: false,
    loginState: LoginNotLoggedIn,
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
