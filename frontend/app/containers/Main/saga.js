import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { all, call, delay, put, select, takeEvery, takeLatest, } from 'redux-saga/effects'

import { requestJSON, defaultOpts, resultFoldMap, resultFold, } from 'alleycat-js/es/fetch'
import { EffAction, EffSaga, EffNoEffect, } from 'alleycat-js/es/saga'

import {} from './actions'
import {} from './selectors'

import { doApiCall, saga, toastError, } from '../../common'

export default function *sagaRoot () {
  yield all ([
  ])
}
