import {
  pipe, compose, composeRight,
  map, prop,
} from 'stick-js/es'

import { all, call, put, select, takeLatest, delay, } from 'redux-saga/effects'

import configure from 'alleycat-js/es/configure'
import { requestCompleteFold, requestJSONStdOpts, noParseCodes, } from 'alleycat-js/es/fetch'
import { error, } from 'alleycat-js/es/general'
import { EffAction, EffSaga, } from 'alleycat-js/es/saga'

import {
  appMounted as a_appMounted,
  dataFetch as a_dataFetch,
  dataFetchCompleted as a_dataFetchCompleted,
  login as a_login,
  logout as a_logout,
  loginLogoutCompleted as a_loginLogoutCompleted,
} from '../actions/main'

import { selectLoggedIn, } from '../store/app/selectors'
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
  // yield call (s_stop_server)
  yield call (s_hello)
  yield delay (helloInterval)
  yield callForever (helloInterval, s_helloWrapper)
}

function *s_stop_server () {
  yield call (doApiCall, {
    url: '/api/stop-server',
  })
}

function *s_dataFetch () {
  yield call (doApiCall, {
    url: '/api/data',
    resultsModify: map ('data' | prop),
    continuation: EffAction (a_dataFetchCompleted),
    imsgDecorate: 'Error fetching data',
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
}

function *s_helloCompleted (res) {
  const onError = (msg) => error ('Error: helloCompleted:', msg)
  const user = res | requestCompleteFold (
    (user) => user,
    // --- 401, i.e. not authorized
    (umsg) => null,
    () => (onError ('(no message)'), null),
  )
  yield put (a_loginLogoutCompleted (user))
}

function *s_hello () {
  yield call (doApiCall, {
    url: '/api/hello',
    resultsModify: map (prop ('data')),
    continuation: EffSaga (s_helloCompleted),
    request: requestJSONStdOpts ({
      noParse: noParseCodes ([401]),
    }),
  })
}

function *s_helloWrapper () {
  const loggedIn = yield select (selectLoggedIn)
  if (loggedIn) yield call (s_hello)
}

function *s_login ({ email, password, }) {
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

function *s_logout () {
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
  else yield call (s_hello)
}

export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_appMounted, s_appMounted),
    saga (takeLatest, a_dataFetch, s_dataFetch),
    saga (takeLatest, a_login, s_login),
    saga (takeLatest, a_logout, s_logout),
  ])
}
