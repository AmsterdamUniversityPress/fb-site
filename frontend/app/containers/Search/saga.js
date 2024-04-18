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

// @todo this API call gives problems with query 'w', see backend/index
// function *s_execute (query) {
  // yield call (doApiCall, {
    // url: '/api/search/autocomplete-query/' + query,
    // resultsModify: map (prop ('results')),
    // continuation: EffAction (a_executeCompleted),
    // oops: toastError,
  // })
// }

function *s_execute (query) {
  yield call (doApiCall, {
    url: '/api/search/autocomplete-query/',
    optsMerge: {
      method: 'POST',
      body: JSON.stringify ({
        data: { query, },
      }),
    },
    resultsModify: map (prop ('results')),
    continuation: EffAction (a_executeCompleted),
    oops: toastError,
  })
}

function *s_queryUpdated (query) {
  if (query === '') return
  yield put (a_execute (query))
}

export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_execute, s_execute),
    saga (takeLatest, a_queryUpdated, s_queryUpdated),
  ])
}
