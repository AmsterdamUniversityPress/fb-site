import {
  pipe, compose, composeRight,
  map, prop, ok, againstAny,
} from 'stick-js/es'

import { all, call, put, select, takeLatest, delay, } from 'redux-saga/effects'

import configure from 'alleycat-js/es/configure'
import { requestCompleteFold, requestJSONStdOpts, noParseCodes, } from 'alleycat-js/es/fetch'
import { between, error, } from 'alleycat-js/es/general'
import { EffAction, EffSaga, } from 'alleycat-js/es/saga'

import {
  appMounted as a_appMounted,
  fondsenFetch as a_fondsenFetch,
  fondsenFetchCompleted as a_fondsenFetchCompleted,
  logIn as a_logIn,
  logOut as a_logOut,
  loginLogoutCompleted as a_loginLogoutCompleted,
} from '../actions/main'

import { selectLoggedInDefaultFalse, } from '../store/app/selectors'
import {} from '../store/domain/selectors'

import { doApiCall, saga, toastError, } from '../../../common'
import config from '../../../config'

const configTop = configure.init (config)
const helloInterval = configTop.get ('general.helloInterval')

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
  // const pageLength = yield select (...)
  const pageLength = 30
  const beginIdx = pageNum * pageLength
  const url = new URL (document.location)
  url.pathname = '/api/fondsen'
  url.searchParams.append ('beginIdx', beginIdx)
  url.searchParams.append ('number', pageLength)
  yield call (doApiCall, {
    url,
    continuation: EffAction (a_fondsenFetchCompleted),
    oops: toastError,
  })
}

function *s_loginCompleted (res) {
  const onError = (msg) => error ('Error: loginCompleted:', msg)
  const user = res | requestCompleteFold (
    // --- ok
    (user) => user,
    // --- 4xx
    (umsg) => (onError (umsg), null),
    // --- 5xx
    () => (onError ('(no message)'), null),
  )
  yield put (a_loginLogoutCompleted (user))
  if (user) yield put (a_fondsenFetch (0))
}

function *s_helloCompleted (res, first=false) {
  const onError = (msg) => error ('Error: helloCompleted:', msg)
  const user = res | requestCompleteFold (
    (user) => user,
    // --- 401, i.e. not authorized
    (_umsg) => null,
    () => (onError ('(no message)'), null),
  )
  yield put (a_loginLogoutCompleted (user))
  if (first && ok (user)) yield put (a_fondsenFetch (0))
}

function *s_hello (first=false) {
  function *s_complete (res) {
    yield call (s_helloCompleted, res, first)
  }
  yield call (doApiCall, {
    url: '/api/hello',
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

function *s_logIn ({ email, password, }) {
  yield call (doApiCall, {
    url: '/api/login',
    optsMerge: {
      method: 'POST',
      body: JSON.stringify ({
        email,
        // --- @todo hash password before sending?
        password,
      }),
    },
    resultsModify: map (prop ('data')),
    continuation: EffSaga (s_loginCompleted),
    imsgDecorate: 'Error logging in',
    // --- if we get 4xx and we have umsg, will show oops bubble with umsg;
    // --- if we get 5xx, show oops with 'Oops, something went wrong!'
    oops: toastError,
  })
}

function *s_logOut () {
  yield call (doApiCall, {
    url: '/api/logout',
    optsMerge: {
      method: 'POST',
    },
    continuation: EffSaga (s_logoutCompleted),
    imsgDecorate: 'Error logging out',
    oops: toastError,
  })
}

function *s_logoutCompleted (res) {
  const onError = (msg) => error ('Error: logoutCompleted:', msg)
  const ok = res | requestCompleteFold (
    () => true,
    (umsg) => (onError (umsg), false),
    () => (onError ('(no message)'), false),
  )
  if (ok) yield put (a_loginLogoutCompleted (null))
  else yield call (s_hello, false)
}

export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_appMounted, s_appMounted),
    saga (takeLatest, a_fondsenFetch, s_fondsenFetch),
    saga (takeLatest, a_logIn, s_logIn),
    saga (takeLatest, a_logOut, s_logOut),
  ])
}
