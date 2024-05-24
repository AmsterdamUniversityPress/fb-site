import {
  pipe, compose, composeRight,
  ok, prop, map, path, id, T, F, lets,
} from 'stick-js/es'

import { fold, toJust, } from 'alleycat-js/es/bilby'
import { foldIfRequestResults, } from 'alleycat-js/es/fetch'
import { logWith, } from 'alleycat-js/es/general'

import { initialState, loginStateFold, } from './reducer'

import { initSelectors, } from '../../../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'app',
  initialState,
)

const selectPage = selectVal ('page')

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
// --- returns Request which wraps (user | null)
const selectUserUser = selectVal ('userUser')
const selectUserInstitution = selectVal ('userInstitution')
export const selectEmailRequestPending = selectVal ('emailRequestPending')
export const selectEmailRequestSuccess = selectVal ('emailRequestSuccess')

// --- returns Request which wraps (true | false)
export const selectUserLoggedIn = select (
  'selectUserLoggedIn',
  [selectUserUser],
  // --- map means take the RequestResults case
  (user) => user | map (ok),
)

// --- returns Request which wraps (true | false)
export const selectInstitutionLoggedIn = select (
  'selectInstitutionLoggedIn',
  [selectUserInstitution],
  // --- map means take the RequestResults case
  (institution) => institution | map (ok),
)

// --- folds to true or false
export const selectUserLoggedInDefaultFalse = select (
  'selectUserLoggedInDefaultFalse',
  [selectUserLoggedIn],
  (user) => user | foldIfRequestResults (
    (yesNo) => yesNo,
    () => false,
  ),
)

// --- folds to true or false
export const selectInstitutionLoggedInDefaultFalse = select (
  'selectInstitutionLoggedInDefaultFalse',
  [selectInstitutionLoggedIn],
  (institution) => institution | foldIfRequestResults (
    (yesNo) => yesNo,
    () => false,
  ),
)

export const selectLoggedInDefaultFalse = select (
  'selectLoggedInDefaultFalse',
  [selectUserLoggedIn, selectInstitutionLoggedIn],
  (user, institution) => user || institution,
)

export const selectGetUserType = select (
  'selectGetUserType',
  [selectUserLoggedInDefaultFalse, selectInstitutionLoggedInDefaultFalse],
  (user, institution) => () => user ? 'user' : institution ? 'institution' : null,
)

// ------ type: institution. Only use these once you're sure that userInstitution is a Just.

export const selectGetContactEmail = select (
  'selectGetContactEmail',
  [selectUserInstitution],
  (institution) => () => institution | toJust | path (['contact', 'email']),
)

export const selectGetInstitutionName = select (
  'selectGetInstitutionName',
  [selectUserInstitution],
  (institution) => () => institution | toJust | prop ('name'),
)

// ------ type: user. Only use these once you're sure that userUser is a Just.

// export const selectGetPrivilege = select (
  // 'selectGetPrivilege',
  // [selectUserUser],
  // (user) => () => user | toJust | prop ('privilege'),
// )

export const selectGetFirstName = select (
  'selectGetFirstName',
  [selectUserUser],
  (user) => () => user | toJust | prop ('firstName'),
)

export const selectGetLastName = select (
  'selectGetLastName',
  [selectUserUser],
  (user) => () => user | toJust | prop ('lastName'),
)

export const selectGetEmail = select (
  'selectGetEmail',
  [selectUserUser],
  (user) => () => user | toJust | prop ('email'),
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

export const selectLoginState = selectVal ('loginState')

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

export const selectUserUserNew = select (
  'userUserNew',
  [selectLoginState],
  (loginState) => loginState | loginStateFold (
    () => null,
    () => null,
    (user) => user,
    (_) => null,
  )
)

export const selectUserInstitutionNew = select (
  'userInstitutionNew',
  [selectLoginState],
  (loginState) => loginState | loginStateFold (
    () => null,
    () => null,
    (_) => null,
    (user) => user,
  )
)

export const selectUserLoggedInNew = select (
  'selectUserLoggedInNew',
  [selectUserUserNew],
  (user) => user | ok,
)

export const selectInstitutionLoggedInNew = select (
  'selectInstitutionLoggedInNew',
  [selectUserInstitutionNew],
  (institution) => institution | ok,
)

export const selectLoggedIn = select (
  'selectLoggedIn',
  [selectUserLoggedInNew, selectInstitutionLoggedInNew],
  (u, i) => u || i,
)

export const selectUserLoggedInDefaultFalseNew = selectUserLoggedInNew
export const selectInstitutionLoggedInDefaultFalseNew = selectInstitutionLoggedInNew

export const selectGetUserTypeNew = select (
  'selectGetUserTypeNew',
  [selectLoginState],
  (loginState) => loginState | loginStateFold (
    () => null,
    () => null,
    () => 'user',
    () => 'institution',
  ),
)

export const selectGetContactEmailNew = select (
  'selectGetContactEmailNew',
  [selectUserInstitutionNew],
  (institution) => () => institution | ifNil (
    () => die ('selectGetContactEmailNew'),
    path (['contact', 'email']),
  ),
)

export const selectGetInstitutionNameNew = select (
  'selectGetInstitutionNameNew',
  [selectUserInstitutionNew],
  (institution) => () => institution | ifNil (
    () => die ('selectGetInstitutionNameNew'),
    prop ('name'),
  ),
)

export const selectGetFirstNameNew = select (
  'selectGetFirstNameNew',
  [selectUserUserNew],
  (user) => () => user | ifNil (
    () => die ('selectGetFirstNameNew'),
    prop ('firstName'),
  ),
)

export const selectGetLastNameNew = select (
  'selectGetLastNameNew',
  [selectUserUserNew],
  (user) => () => user | ifNil (
    () => die ('selectGetLastNameNew'),
    prop ('lastName'),
  ),
)

export const selectGetEmailNew = select (
  'selectGetEmailNew',
  [selectUserUserNew],
  (user) => () => user | ifNil (
    () => die ('selectGetEmailNew'),
    prop ('email'),
  ),
)

