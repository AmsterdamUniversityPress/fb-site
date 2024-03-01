import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { all, call, put, select, takeEvery, takeLatest, } from 'redux-saga/effects'

import { requestJSON, defaultOpts, resultFoldMap, resultFold, } from 'alleycat-js/es/fetch'
import { EffAction, EffSaga, EffNoEffect, } from 'alleycat-js/es/saga'

import {
  fondsDetailFetch as a_fondsDetailFetch,
  fondsDetailFetchCompleted as a_fondsDetailFetchCompleted,
} from './actions'

import {} from './selectors'

import { doApiCall, saga, toastError, } from '../../common'

function *s_fondsDetailFetch (uuid) {
  const url = new URL (document.location)
  url.pathname = '/api/fonds'
  url.searchParams.append ('uuid', uuid)
  yield call (doApiCall, {
    url,
    continuation: EffAction (a_fondsDetailFetchCompleted),
    oops: toastError,
  })
}
export default function *sagaRoot () {
  yield all ([
    saga (takeLatest, a_fondsDetailFetch, s_fondsDetailFetch),
  ])
}
