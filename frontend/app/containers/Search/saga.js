import {
  pipe, compose, composeRight,
  map, prop, sprintfN,
} from 'stick-js/es'

import { all, call, delay, put, select, takeEvery, takeLatest, } from 'redux-saga/effects'

import { foldWhenJust, } from 'alleycat-js/es/bilby'
import { requestJSON, defaultOpts, resultFoldMap, resultFold, } from 'alleycat-js/es/fetch'
import { EffAction, EffSaga, EffNoEffect, } from 'alleycat-js/es/saga'

import {
  updateFilterToggle as a_updateFilterToggle,
} from './actions'
import {
  selectQuery as selectSearchQuery,
  selectSelectedFiltersTuplesWithUpdate,
} from './selectors'

import { doApiCall, saga, toastError, } from '../../common'

function *s_updateFilterToggle ({ filterName, value, navigate, }) {
  const searchQuery = yield select (selectSearchQuery)
  const selector = yield select (selectSelectedFiltersTuplesWithUpdate)
  const tuples = selector ([filterName, value])
  const params = new URLSearchParams (tuples)
  navigate ([encodeURIComponent (searchQuery), params.toString ()] | sprintfN (
    '/search/%s?%s',
  ))
}

export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_updateFilterToggle, s_updateFilterToggle),
  ])
}
