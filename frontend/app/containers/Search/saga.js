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
import { selectQuery as selectSearchQuery, selectSelectedFilters, } from './selectors'

import { doApiCall, saga, toastError, } from '../../common'
import { flatten, mapRemapTuples, mapUpdate, setRemap, setToggle, } from '../../util-general'

function *s_updateFilterToggle ({ filterName, value, navigate, }) {
  const selectedFilters = yield select (selectSelectedFilters)
  const searchQuery = yield select (selectSearchQuery)
  const filters = selectedFilters | mapUpdate (
    filterName, setToggle (value),
  )
  const tuples = flatten (1) (filters | mapRemapTuples (
    (filterName, values) => values | setRemap (
      (value) => [filterName, value],
    )
  ))
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
