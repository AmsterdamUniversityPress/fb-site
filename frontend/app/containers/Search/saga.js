import {
  pipe, compose, composeRight,
  map, prop,
} from 'stick-js/es'

import { all, call, delay, put, select, takeEvery, takeLatest, } from 'redux-saga/effects'

import { foldWhenJust, } from 'alleycat-js/es/bilby'
import { requestJSON, defaultOpts, resultFoldMap, resultFold, } from 'alleycat-js/es/fetch'
import { EffAction, EffSaga, EffNoEffect, } from 'alleycat-js/es/saga'

import {
  autocompleteFetch as a_autocompleteFetch,
  autocompleteFetchCompleted as a_autocompleteFetchCompleted,
  queryUpdated as a_queryUpdated,
} from './actions'

import { doApiCall, saga, toastError, } from '../../common'

function *s_autocompleteFetch (query) {
  yield call (doApiCall, {
    url: '/api/search/autocomplete-query/' + query,
    resultsModify: map (prop ('results')),
    continuation: EffAction (a_autocompleteFetchCompleted),
    oops: toastError,
  })
}

function *s_queryUpdated (query) {
  if (query === '') return
  yield put (a_autocompleteFetch (query))
}

export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_autocompleteFetch, s_autocompleteFetch),
    saga (takeLatest, a_queryUpdated, s_queryUpdated),
  ])
}
