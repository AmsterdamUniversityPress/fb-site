import {
  pipe, compose, composeRight,
  ok, prop, path, id, T, F, lets, ifNil, die,
} from 'stick-js/es'

import { fold, toJust, } from 'alleycat-js/es/bilby'
import { logWith, } from 'alleycat-js/es/general'

import { initialState, loginStateFold, } from './reducer'

import { initSelectors, } from '../../../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'app',
  initialState,
)

const pageInfo = (page) => [
  page === 'reset-password' || page === 'init-password' || page === 'login',
  page === 'login',
  page === 'user-admin',
]

export const selectAllowAnalytical = selectVal ('allowAnalytical')
export const selectCookiesDecided = select (
  'cookiesDecided',
  [selectAllowAnalytical],
  ok,
)
export const selectEmailRequestPending = selectVal ('emailRequestPending')
export const selectEmailRequestSuccess = selectVal ('emailRequestSuccess')

export const selectLoginState = selectVal ('loginState')

export const selectUserUser = select (
  'userUser',
  [selectLoginState],
  (loginState) => loginState | loginStateFold (
    () => null,
    () => null,
    (user) => user,
    (_) => null,
  )
)

export const selectUserInstitution = select (
  'userInstitution',
  [selectLoginState],
  (loginState) => loginState | loginStateFold (
    () => null,
    () => null,
    (_) => null,
    (user) => user,
  )
)

// ------ type: institution. Only use these once you're sure that userInstitution is a Just.

export const selectGetContactEmail = select (
  'selectGetContactEmail',
  [selectUserInstitution],
  (institution) => () => institution | ifNil (
    () => die ('selectGetContactEmail'),
    path (['contact', 'email']),
  ),
)

export const selectGetInstitutionName = select (
  'selectGetInstitutionName',
  [selectUserInstitution],
  (institution) => () => institution | ifNil (
    () => die ('selectGetInstitutionName'),
    prop ('name'),
  ),
)

// ------ type: user. Only use these once you're sure that userUser is a Just.

export const selectGetFirstName = select (
  'selectGetFirstName',
  [selectUserUser],
  (user) => () => user | ifNil (
    () => die ('selectGetFirstName'),
    prop ('firstName'),
  ),
)

export const selectGetLastName = select (
  'selectGetLastName',
  [selectUserUser],
  (user) => () => user | ifNil (
    () => die ('selectGetLastName'),
    prop ('lastName'),
  ),
)

export const selectGetEmail = select (
  'selectGetEmail',
  [selectUserUser],
  (user) => () => user | ifNil (
    () => die ('selectGetEmail'),
    prop ('email'),
  ),
)

export const selectLoggedInUnknown = select (
  'loggedInUnknown',
  [selectLoginState],
  (loginState) => loginState | loginStateFold (
    F, T, F, F,
  ),
)

export const selectLoggedInTristate = select (
  'loggedInTristate',
  [selectLoginState],
  // --- f: not logged in, g: unknown, h: logged in
  (loginState) => (f, g, h) => loginState | loginStateFold (
    () => f (),
    () => g (),
    () => h (true, false),
    () => h (false, true),
  ),
)

export const selectLandingDecision = select (
  'landingDecision',
  [selectLoggedInTristate],
  /*
   * f: when not logged in and visiting a page which needs authorization (send to login)
   * g: login status unknown (/hello is probably pending)
   * h: when logged in and visiting /login (send away from /login)
   * i: when logged in and visiting /user-admin
   */
  (tristate) => (page) => (f, g, h, i) => lets (
    () => pageInfo (page),
    ([pageUnauthorizedOk, pageIsLogin, pageIsUserAdmin]) => tristate (
      // --- not logged in
      () => pageUnauthorizedOk || f (),
      // --- unknown
      () => g (),
      // --- logged in
      (isUser, _isInstitution) => {
        if (pageIsLogin && isUser) return h ()
        if (pageIsUserAdmin) return i ()
      },
    )
  ),
)

export const selectUserLoggedIn = select (
  'selectUserLoggedIn',
  [selectUserUser],
  (user) => user | ok,
)

export const selectInstitutionLoggedIn = select (
  'selectInstitutionLoggedIn',
  [selectUserInstitution],
  (institution) => institution | ok,
)

export const selectLoggedIn = select (
  'selectLoggedIn',
  [selectUserLoggedIn, selectInstitutionLoggedIn],
  (u, i) => u || i,
)

export const selectGetUserType = select (
  'selectGetUserType',
  [selectLoginState],
  (loginState) => loginState | loginStateFold (
    () => null,
    () => null,
    () => 'user',
    () => 'institution',
  ),
)

const selectPrivileges = selectVal ('userPrivileges')

const selectPrivilegesSet = select (
  'privilegesSet',
  [selectPrivileges],
  (privileges) => new Set (privileges | fold (id, [])),
)

export const selectHasPrivilegeAdminUser = select (
  'hasPrivilegeAdminUser',
  [selectPrivilegesSet],
  (privs) => privs.has ('admin-user'),
)
