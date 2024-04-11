import {
  pipe, compose, composeRight,
  map, prop,
} from 'stick-js/es'

import { all, call, delay, put, select, takeEvery, takeLatest, } from 'redux-saga/effects'

import { foldWhenJust, } from 'alleycat-js/es/bilby'
import { requestJSON, defaultOpts, resultFoldMap, resultFold, } from 'alleycat-js/es/fetch'
import { EffAction, EffSaga, EffNoEffect, } from 'alleycat-js/es/saga'

import {
  execute as a_execute,
  executeCompleted as a_executeCompleted,
  queryUpdated as a_queryUpdated,
} from './actions'
import { selectQuery, } from './selectors'

import { doApiCall, saga, toastError, } from '../../common'

function *s_execute (query) {
  yield call (doApiCall, {
    url: '/api/search/autocomplete-search/' + query,
    resultsModify: map (prop ('results')),
    continuation: EffAction (a_executeCompleted),
  })
}

function *s_queryUpdated (_query) {
  const queryMb = yield select (selectQuery)
  yield queryMb | foldWhenJust (
    (query) => put (a_execute (query)),
  )
}

export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_execute, s_execute),
    saga (takeLatest, a_queryUpdated, s_queryUpdated),
  ])
}
