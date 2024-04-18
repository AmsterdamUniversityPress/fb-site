import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { all, call, put, select, takeEvery, takeLatest, } from 'redux-saga/effects'

import {} from './actions'
import { init as initSelectors, } from './selectors'

export default (key) => {
  const selectors = initSelectors (key)
  return function *sagaRoot () {
    yield all ([
    ])
  }
}

