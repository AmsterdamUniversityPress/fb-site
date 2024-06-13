import {
  pipe, compose, composeRight,
  map, prop, sprintfN,
} from 'stick-js/es'

import { all, call, delay, put, select, takeEvery, takeLatest, } from 'redux-saga/effects'

import { foldWhenJust, } from 'alleycat-js/es/bilby'
import { requestJSON, defaultOpts, resultFoldMap, resultFold, } from 'alleycat-js/es/fetch'
import { EffAction, EffSaga, EffNoEffect, } from 'alleycat-js/es/saga'

import {
  clearFiltersAndQuery as a_clearFiltersAndQuery,
  updateFilterToggle as a_updateFilterToggle,
  updateSearchQuery as a_updateSearchQuery,
} from './actions'
import {
  selectQuery as selectSearchQuery,
  selectSelectedFilters,
  selectSelectedFiltersTuplesWithUpdate,
} from './selectors'

import { doApiCall, saga, toastError, } from '../../common'

function *s_clearFilters (navigate) {
  const searchQuery = yield select (selectSearchQuery)
  navigate ([encodeURIComponent (searchQuery)] | sprintfN (
    '/search/%s',
  ))
}

function *s_clearFiltersAndQuery (navigate) {
  navigate ('/search/*')
}

function *s_updateFilterToggle ({ filterName, value, navigate, }) {
  const searchQuery = yield select (selectSearchQuery)
  const selector = yield select (selectSelectedFiltersTuplesWithUpdate)
  const tuples = selector ([filterName, value])
  const params = new URLSearchParams (tuples)
  navigate ([encodeURIComponent (searchQuery), params.toString ()] | sprintfN (
    '/search/%s?%s',
  ))
}
// --- @todo
// this function could be refactored with s_updateFilterToggle.
// The use of selectSelectedFiltersTuplesWithUpdate, to be precise, to give null as 'updateSpec'
// might be confusing.
function *s_updateSearchQuery ({ searchQuery, navigate, }) {
  const selector = yield select (selectSelectedFiltersTuplesWithUpdate)
  const tuples = selector (null)
  const params = new URLSearchParams (tuples)
  navigate ([encodeURIComponent (searchQuery), params.toString ()] | sprintfN (
    '/search/%s?%s',
  ))
}

export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_clearFiltersAndQuery, s_clearFiltersAndQuery),
    saga (takeLatest, a_updateFilterToggle, s_updateFilterToggle),
    saga (takeLatest, a_updateSearchQuery, s_updateSearchQuery),
  ])
}
