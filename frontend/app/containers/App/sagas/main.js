import {
  pipe, compose, composeRight,
  map, prop, ok, againstAny, lets,
  id, ifOk, concatTo, tap, join,
} from 'stick-js/es'

import { all, call, put, select, takeEvery, takeLatest, delay, } from 'redux-saga/effects'

import configure from 'alleycat-js/es/configure'
import { requestCompleteFold, requestJSONStdOpts, noParseCodes, } from 'alleycat-js/es/fetch'
import { between, error, logWith, } from 'alleycat-js/es/general'
import { EffAction, EffSaga, } from 'alleycat-js/es/saga'
import { cata, } from 'alleycat-js/es/bilby'

import {
  appMounted as a_appMounted,
  fondsenFetch as a_fondsenFetch,
  fondsenFetchCompleted as a_fondsenFetchCompleted,
  logIn as a_logIn,
  logOut as a_logOut,
  loginUserCompleted as a_loginUserCompleted,
  loggedOutUser as a_loggedOutUser,
  loggedInInstitution as a_loggedInInstitution,
  passwordUpdate as a_passwordUpdate,
  passwordUpdateCompleted as a_passwordUpdateCompleted,
  resetPassword as a_resetPassword,
  sendWelcomeEmail as a_sendWelcomeEmail,
  sendWelcomeEmailCompleted as a_sendWelcomeEmailCompleted,
  userRemove as a_userRemove,
  userRemoveCompleted as a_userRemoveCompleted,
  userAdd as a_userAdd,
  userAddCompleted as a_userAddCompleted,
  usersFetch as a_usersFetch,
  usersFetchCompleted as a_usersFetchCompleted,
} from '../actions/main'
import {
  setPage as a_setPage,
  setNumPerPageIdx as a_setNumPerPageIdx,
} from '../../shared/Pagination/actions'
import { selectLoggedInDefaultFalse, } from '../store/app/selectors'
import {} from '../store/domain/selectors'

import { selectNumPerPage, selectPage, } from '../../shared/Pagination/selectors'

import { doApiCall, saga, toastError, toastInfo, whenRequestCompleteSuccess, } from '../../../common'
import config from '../../../config'

const configTop = configure.init (config)
const helloInterval = configTop.get ('general.helloInterval')

// --- @temporary, for testing
const mkURL = (base='/') => lets (
  () => document.location,
  ({ port, }) => port | ifOk (concatTo (':'), () => ''),
  ({ protocol, hostname, }, port) => [
    [protocol, hostname] | join ('//'),
    port,
    base,
  ] | join (''),
  (_, __, l) => new URL (l),
)
const getIPAuthorize = () => lets (
  () => new URLSearchParams (document.location.search),
  (params) => Number (params.get ('disable-ip-authorize')),
)
const getIPDisableAuthorizeURL = (base) => {
  const url = mkURL (base)
  url.searchParams.append ('disable-ip-authorize', getIPAuthorize ())
  return url
}

function *callForever (delayMs, f, ... args) {
  yield call (f, ... args)
  yield delay (delayMs)
  yield call (callForever, delayMs, f, ... args)
}

function *s_appMounted () {
  yield call (s_hello, true)
  yield delay (helloInterval)
  yield callForever (helloInterval, s_helloWrapper)
}

function *s_fondsenFetch (pageNum) {
  const pageLength = yield select (selectNumPerPage)
  const beginIdx = pageNum * pageLength
  const url = mkURL ()
  url.pathname = '/api/fondsen'
  url.searchParams.append ('beginIdx', beginIdx)
  url.searchParams.append ('number', pageLength)
  yield call (doApiCall, {
    url,
    continuation: EffAction (a_fondsenFetchCompleted),
    oops: toastError,
  })
}

function *s_fondsenRefresh () {
  const pageNum = yield select (selectPage)
  yield put (a_fondsenFetch (pageNum))
}

function *s_loginUserCompleted (rcomplete) {
  const onError = (msg) => error ('Error: loginCompleted:', msg)
  const user = rcomplete | requestCompleteFold (
    // --- ok
    (user) => user,
    // --- 4xx
    (umsg) => (onError (umsg), null),
    // --- 5xx
    () => (onError ('(no message)'), null),
  )
  yield put (a_loginUserCompleted (user))
  if (user) yield call (s_fondsenRefresh)
}

function *s_helloCompleted (rcomplete, first=false) {
  const onError = (msg) => error ('Error: helloCompleted:', msg)
  const user = rcomplete | requestCompleteFold (
    (user) => user,
    // --- 401, i.e. not authorized
    (_umsg) => null,
    // --- @todo this logs the user out if hello fails (e.g. network error), which is a bit overkill.
    () => (onError ('(no message)'), null),
  )
  // --- @todo some of this is repeated from s_loginUserCompleted
  if (ok (user)) {
    if (first) yield call (s_fondsenRefresh)
    if (user.type === 'institution') yield put (a_loggedInInstitution (user))
    else if (user.type === 'user') yield put (a_loginUserCompleted (user))
    else error ('Unexpected user type ' + user.type)
  }
  else yield put (a_loginUserCompleted (null))
}

function *s_hello (first=false) {
  function *s_complete (res) {
    yield call (s_helloCompleted, res, first)
  }
  yield call (doApiCall, {
    // url: '/api/hello',
    url: getIPDisableAuthorizeURL ('/api/hello'),
    resultsModify: map (prop ('data')),
    continuation: EffSaga (s_complete),
    request: requestJSONStdOpts ({
      // --- @todo make consistent
      noParse: againstAny ([
        between (400, 498),
        between (500, 598),
      ])
    }),
  })
}

function *s_helloWrapper () {
  const loggedIn = yield select (selectLoggedInDefaultFalse)
  if (loggedIn) yield call (s_hello, false)
}

function *s_logInUser ({ email, password, }) {
  yield call (doApiCall, {
    url: '/api/login',
    optsMerge: {
      method: 'post',
      body: JSON.stringify ({
        email,
        // --- @todo hash password before sending?
        password,
      }),
    },
    resultsModify: map (prop ('data')),
    continuation: EffSaga (s_loginUserCompleted),
    imsgDecorate: 'Error logging in',
    // --- if we get 4xx and we have umsg, will show oops bubble with umsg;
    // --- if we get 5xx, show oops with 'Oops, something went wrong!'
    oops: toastError,
  })
}

function *s_logOutUser () {
  yield call (doApiCall, {
    url: '/api/logout',
    optsMerge: {
      method: 'POST',
    },
    continuation: EffSaga (s_logoutUserCompleted),
    imsgDecorate: 'Error logging out',
    oops: toastError,
  })
}

function *s_logoutUserCompleted (rcomplete) {
  const onError = (msg) => error ('Error: logoutCompleted:', msg)
  const ok = rcomplete | requestCompleteFold (
    () => true,
    (umsg) => (onError (umsg), false),
    () => (onError ('(no message)'), false),
  )
  if (ok) yield put (a_loggedOutUser ())
  yield call (s_hello, false)
}

function *s_passwordUpdateCompleted (rcomplete) {
  rcomplete | cata ({
    // error is dealt with in s_passwordUpdate
    RequestCompleteError: (_e) => {},
    RequestCompleteSuccess: (_) => toastInfo ('Je nieuwe wachtwoord is succesvol opgeslagen.')
  })
}

function *s_passwordUpdate ({ email, oldPassword, newPassword, }) {
  yield call (doApiCall, {
    url: '/api/user',
    optsMerge: {
      method: 'PATCH',
      body: JSON.stringify ({
        // --- @todo hash password before sending?
        data: { email, oldPassword, newPassword, },
      }),
    },
    continuation: EffAction (a_passwordUpdateCompleted),
    imsgDecorate: 'Error password update',
    oops: toastError,
  })
}

function *s_userAdd ({ email, firstName, lastName, privileges }) {
  yield call (doApiCall, {
    url: '/api/user-admin',
    optsMerge: {
      method: 'PUT',
      body: JSON.stringify ({
        data: { email, firstName, lastName, privileges }
      })
    },
    continuation: EffAction (a_userAddCompleted),
    oops: toastError,
  })
}

function *s_userRemoveCompleted ({ rcomplete, email: _email, }) {
  yield put (a_usersFetch ())
  rcomplete | whenRequestCompleteSuccess (
    () => toastInfo ('Het verwijderen van de gebruiker is geslaagd.'),
  )
}

function *s_userRemove (email) {
  function *done (rcomplete) {
    yield put (a_userRemoveCompleted (rcomplete, email))
  }
  yield call (doApiCall, {
    url: '/api/user-admin/' + email,
    optsMerge: {
      method: 'DELETE',
    },
    continuation: EffSaga (done),
    oops: toastError,
  })
}

function *s_usersFetch () {
  yield call (doApiCall, {
    url: '/api/users',
    continuation: EffAction (a_usersFetchCompleted),
    resultsModify: map (prop ('users')),
    imsgDecorate: 'Error fetching users',
    oops: toastError,
  })
}

function *s_setPage () {
  yield call (s_fondsenRefresh)
}

function *s_setNumPerPageIdx () {
  yield put (a_setPage (0))
  yield call (s_fondsenRefresh)
}

function *s_resetPasswordCompleted (rcomplete, email, navigate) {
  rcomplete | whenRequestCompleteSuccess (
    () => {
      toastInfo ('Je nieuwe wachtwoord is succesvol opgeslagen.')
      navigate ('/login/' + email)
    }
  )
}

function *s_resetPassword ({ email, password, token, navigate, }) {
  function *done (rcomplete) {
    yield call (s_resetPasswordCompleted, rcomplete, email, navigate)
  }
  yield call (doApiCall, {
    url: '/api/user/reset-password',
    optsMerge: {
      method: 'POST',
      body: JSON.stringify ({
        // --- @todo hash password before sending?
        data: { email, password, token, },
      }),
    },
    continuation: EffSaga (done),
    oops: toastError,
  })
}

function *s_sendWelcomeEmail (email) {
  function *done (rcomplete) {
    yield put (a_sendWelcomeEmailCompleted (rcomplete, email))
  }
  yield call (doApiCall, {
    url: '/api/user/send-welcome-email',
    optsMerge: {
      method: 'POST',
      body: JSON.stringify ({
        data: { email, },
      }),
    },
    continuation: EffSaga (done),
    oops: toastError,
  })
}

function *s_sendWelcomeEmailCompleted ({ rcomplete, email, }) {
  const ok = rcomplete | requestCompleteFold (
    // --- ok
    () => true,
    (umsg) => (error (umsg), false),
    () => false,
  )
  if (ok) toastInfo ('Welkomst e-mail opnieuw verstuurd naar ' + email)
}

export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_appMounted, s_appMounted),
    saga (takeLatest, a_fondsenFetch, s_fondsenFetch),
    saga (takeLatest, a_logIn, s_logInUser),
    saga (takeLatest, a_logOut, s_logOutUser),
    saga (takeLatest, a_passwordUpdate, s_passwordUpdate),
    saga (takeLatest, a_passwordUpdateCompleted, s_passwordUpdateCompleted),
    saga (takeLatest, a_resetPassword, s_resetPassword),
    saga (takeEvery, a_sendWelcomeEmail, s_sendWelcomeEmail),
    saga (takeLatest, a_sendWelcomeEmailCompleted, s_sendWelcomeEmailCompleted),
    saga (takeLatest, a_usersFetch, s_usersFetch),
    saga (takeLatest, a_userRemove, s_userRemove),
    saga (takeLatest, a_userRemoveCompleted, s_userRemoveCompleted),
    saga (takeLatest, a_userAdd, s_userAdd),

    // --- Pagination
    saga (takeLatest, a_setPage, s_setPage),
    saga (takeLatest, a_setNumPerPageIdx, s_setNumPerPageIdx),
  ])
}
