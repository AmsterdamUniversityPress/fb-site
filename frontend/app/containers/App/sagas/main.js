import {
  pipe, compose, composeRight,
  map, prop, ok, againstAny, lets, nil,
  id, ifOk, concatTo, tap, join, ifNil,
  reduce, sprintfN, defaultToV,
  recurry, each, whenOk,
} from 'stick-js/es'

import { all, call, put, select, takeEvery, takeLatest, delay, } from 'redux-saga/effects'

import configure from 'alleycat-js/es/configure'
import { requestCompleteFold, requestJSONStdOpts, } from 'alleycat-js/es/fetch'
import { between, error, logWith, } from 'alleycat-js/es/general'
import { EffAction, EffSaga, } from 'alleycat-js/es/saga'
import { cata, } from 'alleycat-js/es/bilby'

import {
  allowAnalyticalUpdate as a_allowAnalyticalUpdate,
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
  sendResetEmail as a_sendResetEmail,
  sendResetEmailCompleted as a_sendResetEmailCompleted,
  sendWelcomeEmail as a_sendWelcomeEmail,
  sendWelcomeEmailCompleted as a_sendWelcomeEmailCompleted,
  setAllowAnalytical as a_setAllowAnalytical,
  userRemove as a_userRemove,
  userRemoveCompleted as a_userRemoveCompleted,
  userAdd as a_userAdd,
  userAddCompleted as a_userAddCompleted,
  usersFetch as a_usersFetch,
  usersFetchCompleted as a_usersFetchCompleted,
} from '../actions/main'
import {
  autocompleteFetch as a_autocompleteFetch,
  autocompleteFetchCompleted as a_autocompleteFetchCompleted,
  autocompleteQueryUpdated as a_autocompleteQueryUpdated,
  searchFetch as a_searchFetch,
  searchFetchCompleted as a_searchFetchCompleted,
  searchBucketsFetchCompleted as a_searchBucketsFetchCompleted,
  searchReset as a_searchReset,
} from '../../Search/actions'
import {
  setPage as a_setPage,
  setNumPerPageIdx as a_setNumPerPageIdx,
} from '../../shared/Pagination/actions'
import { selectLoggedIn, } from '../store/app/selectors'
import {} from '../store/domain/selectors'
import {
  selectFilterSearchParams as selectSearchFilterSearchParams,
  selectQuery as selectSearchQuery,
  selectLastUpdatedFilterName,
} from '../../../containers/Search/selectors'
import { init as initPaginationSelectors, } from '../../shared/Pagination/selectors'

import { doApiCall, saga, toastError, toastInfo, whenRequestCompleteSuccess, } from '../../../common'
import { lookupOnOrDie, } from '../../../util-general'
import config from '../../../config'

const configTop = configure.init (config)

const helloInterval = configTop.get ('general.helloInterval')
const paginationKeyFondsen = configTop.get ('app.keys.Pagination.fonds')
const paginationKeySearch = configTop.get ('app.keys.Pagination.search')

const { selectNumPerPage: selectNumFondsenPerPage, selectPage: selectFondsenPage, } = initPaginationSelectors (paginationKeyFondsen)
const { selectNumPerPage: selectNumSearchResultsPerPage, selectPage: selectSearchResultsPage, } = initPaginationSelectors (paginationKeySearch)

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

function *fondsenRefresh (resetResults=true) {
  const pageNum = yield select (selectFondsenPage)
  yield put (a_fondsenFetch (pageNum, resetResults))
}

function *hello (first=false) {
  function *done (res) {
    yield call (helloCompleted, res, first)
  }
  yield call (doApiCall, {
    // url: '/api/hello',
    url: getIPDisableAuthorizeURL ('/api/hello'),
    optsMerge: {
      method: 'POST',
    },
    resultsModify: map (prop ('data')),
    continuation: EffSaga (done),
    request: requestJSONStdOpts ({
      // --- @todo make consistent
      noParse: againstAny ([
        between (400, 498),
        between (500, 598),
      ])
    }),
  })
}

function *helloCompleted (rcomplete, first=false) {
  const onError = (msg) => error ('Error: helloCompleted:', msg)
  const user = rcomplete | requestCompleteFold (
    ({ userinfo, }) => userinfo,
    // --- 401, i.e. not authorized
    (_umsg) => null,
    // --- @todo this logs the user out if hello fails (e.g. network error), which is a bit overkill.
    () => (onError ('(no message)'), null),
  )
  if (ok (user)) {
    if (first) yield call (fondsenRefresh, false)
    if (user.type === 'institution') yield put (a_loggedInInstitution (user))
    else if (user.type === 'user') yield put (a_loginUserCompleted (rcomplete))
    else error ('Unexpected user type ' + user.type)
  }
}

function *helloWrapper () {
  const loggedIn = yield select (selectLoggedIn)
  if (loggedIn) yield call (hello, false)
}

// --- @todo we should probably crash the whole app if logout fails (we're probably in a hard to
// defined state if that happens)
function *logoutUserCompleted (rcomplete) {
  const onError = (msg) => error ('Error: logoutCompleted:', msg)
  const ok = rcomplete | requestCompleteFold (
    () => true,
    (umsg) => (onError (umsg), false),
    () => (onError ('(no message)'), false),
  )
  if (ok) yield put (a_loggedOutUser ())
  yield call (hello, false)
}

// --- redoes a search with the current query and filters -- useful for when the page number /
// number per page has changed.
function *redoSearchIfActive () {
  const query = yield select (selectSearchQuery)
  if (nil (query)) return
  const filters = yield select (selectSearchFilterSearchParams)
  yield put (a_searchFetch (query, filters))
}

function *sendEmail (email, type) {
  const [url, action] = type | lookupOnOrDie (
    'sendWelcomeEmail (): Invalid type ' + type,
    {
      reset: ['/api/user/send-reset-email', a_sendResetEmailCompleted],
      welcome: ['/api/user/send-welcome-email', a_sendWelcomeEmailCompleted],
    },
  )
  function *done (rcomplete) {
    yield put (action (rcomplete, email))
  }
  yield call (doApiCall, {
    url,
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

function *s_allowAnalyticalUpdate (allow) {
  function *done (_rcomplete) {
    yield put (a_setAllowAnalytical (allow))
  }
  yield call (doApiCall, {
    url: '/api/user-allow-analytical',
    optsMerge: {
      method: 'POST',
      body: JSON.stringify ({
        data: { allow, },
      }),
    },
    continuation: EffSaga (done),
    imsgDecorate: 'Error allow analytical update',
    oops: toastError,
  })
}

function *s_appMounted () {
  yield call (hello, true)
  yield delay (helloInterval)
  yield callForever (helloInterval, helloWrapper)
}

function *s_autocompleteFetch (query) {
  yield call (doApiCall, {
    url: '/api/search/autocomplete-query/' + query,
    resultsModify: map (prop ('results')),
    continuation: EffAction (a_autocompleteFetchCompleted),
    oops: toastError,
  })
}

function *s_autocompleteQueryUpdated (query) {
  if (query === '') return
  yield put (a_autocompleteFetch (query))
}

function *s_fondsenFetch ({ pageNum, ... _ }) {
  const pageLength = yield select (selectNumFondsenPerPage)
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
    continuation: EffAction (a_loginUserCompleted),
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
    continuation: EffSaga (logoutUserCompleted),
    imsgDecorate: 'Error logging out',
    oops: toastError,
  })
}

function *s_passwordUpdate ({ oldPassword, newPassword, }) {
  yield call (doApiCall, {
    url: '/api/user',
    optsMerge: {
      method: 'PATCH',
      body: JSON.stringify ({
        // --- @todo hash password before sending?
        data: { oldPassword, newPassword, },
      }),
    },
    continuation: EffAction (a_passwordUpdateCompleted),
    imsgDecorate: 'Error password update',
    oops: toastError,
  })
}

function *s_passwordUpdateCompleted (rcomplete) {
  rcomplete | cata ({
    // error is dealt with in s_passwordUpdate
    RequestCompleteError: (_e) => {},
    RequestCompleteSuccess: (_) => toastInfo (
      'Je nieuwe wachtwoord is succesvol opgeslagen.',
    )
  })
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

function *s_resetPasswordCompleted (rcomplete, email, navigate) {
  rcomplete | whenRequestCompleteSuccess (
    () => {
      toastInfo ('Je nieuwe wachtwoord is succesvol opgeslagen.')
      navigate ('/login/' + email)
    },
  )
}

// --- @todo move to Search?
function *s_searchFetch ({ query, filterSearchParams, }) {
  const pageSize = yield select (selectNumSearchResultsPerPage)
  const pageNum = yield select (selectSearchResultsPage)
  filterSearchParams.set ('pageSize', pageSize)
  filterSearchParams.set ('pageNum', pageNum)
  yield call (doApiCall, {
    url: [encodeURIComponent (query), filterSearchParams.toString ()] | sprintfN (
      '/api/search/search/%s?%s',
    ),
    continuation: EffAction (a_searchFetchCompleted),
    oops: toastError,
  })
  const bucketSearchParams = new URLSearchParams (filterSearchParams)
  const lastUpdatedFilterName = yield select (selectLastUpdatedFilterName)
  bucketSearchParams.delete (lastUpdatedFilterName)
  yield call (doApiCall, {
    url: [encodeURIComponent (query), bucketSearchParams.toString ()] | sprintfN (
      '/api/search/search/%s?%s',
    ),
    continuation: EffAction (a_searchBucketsFetchCompleted),
    oops: toastError,
  })
}

function *s_searchReset () {
  yield put (a_setPage (paginationKeySearch, 0, { doNewSearch: false, }))
}

function *s_sendResetEmail (email) {
  yield call (sendEmail, email, 'reset')
}

function *s_sendResetEmailCompleted ({ rcomplete, email, }) {
  const ok = rcomplete | requestCompleteFold (
    // --- ok
    () => true,
    (umsg) => (error (umsg), false),
    () => false,
  )
  if (ok) toastInfo ('We hebben een e-mail met instructies naar ' + email + ' gestuurd.')
}

function *s_sendWelcomeEmail (email) {
  yield call (sendEmail, email, 'welcome')
}

function *s_sendWelcomeEmailCompleted ({ rcomplete, email, }) {
  const ok = rcomplete | requestCompleteFold (
    // --- ok
    () => true,
    (umsg) => (error (umsg), false),
    () => false,
  )
  if (ok) toastInfo ('Welkomst e-mail opnieuw verstuurd naar ' + email + '.')
}

function *s_setNumPerPageIdx ({ key, ... _}) {
  yield put (a_setPage (key, 0))
  if (key === paginationKeyFondsen) yield call (fondsenRefresh, true)
  else if (key === paginationKeySearch) yield call (redoSearchIfActive)
}

function *s_setPage ({ key, userdata=null, ... _}) {
  if (key === paginationKeyFondsen) yield call (fondsenRefresh, true)
  else if (key === paginationKeySearch) {
    const doNewSearch = userdata | ifNil (
      () => true,
      prop ('doNewSearch'),
    )
    if (doNewSearch) yield call (redoSearchIfActive)
  }
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

function *s_userRemoveCompleted ({ rcomplete, email: _email, }) {
  yield put (a_usersFetch ())
  rcomplete | whenRequestCompleteSuccess (
    () => toastInfo ('Het verwijderen van de gebruiker is geslaagd.'),
  )
}

function *s_usersFetch () {
  yield call (doApiCall, {
    url: '/api/user-admin/users',
    continuation: EffAction (a_usersFetchCompleted),
    resultsModify: map (prop ('users')),
    imsgDecorate: 'Error fetching users',
    oops: toastError,
  })
}

export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_allowAnalyticalUpdate, s_allowAnalyticalUpdate),
    saga (takeLatest, a_appMounted, s_appMounted),
    saga (takeLatest, a_autocompleteFetch, s_autocompleteFetch),
    saga (takeLatest, a_autocompleteQueryUpdated, s_autocompleteQueryUpdated),
    saga (takeLatest, a_fondsenFetch, s_fondsenFetch),
    saga (takeLatest, a_logIn, s_logInUser),
    saga (takeLatest, a_logOut, s_logOutUser),
    saga (takeLatest, a_passwordUpdate, s_passwordUpdate),
    saga (takeLatest, a_passwordUpdateCompleted, s_passwordUpdateCompleted),
    saga (takeLatest, a_resetPassword, s_resetPassword),
    saga (takeLatest, a_searchFetch, s_searchFetch),
    saga (takeLatest, a_searchReset, s_searchReset),
    saga (takeLatest, a_sendResetEmail, s_sendResetEmail),
    saga (takeLatest, a_sendResetEmailCompleted, s_sendResetEmailCompleted),
    saga (takeEvery,  a_sendWelcomeEmail, s_sendWelcomeEmail),
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
