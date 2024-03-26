import {
  pipe, compose, composeRight,
  invoke, ifOk, id,
  mergeM,
  isObject, isFunction,
} from 'stick-js/es'

import { combineReducers, createStore, applyMiddleware, compose as reduxCompose, } from 'redux'
import createSagaMiddleware from 'redux-saga'

// --- @future more elegant function
export const conformsTo = (shape) => (o) => {
  for (const k in shape) {
    const p = shape [k]
    if (!p (o [k])) return false
  }
  return true
}

const sagaMiddleware = createSagaMiddleware ()

/* Reducers can be added here (before `...irs` in the table passed to
 * `combineReducers`), and/or injected into components.
 *
 * There is a small difference: when injecting reducers, the slice of the store they create is not
 * available for the instant before the effect hook is called, so selectors need to fall back on
 * initialState if the slice is nil.
 *
 * This will be called first without arguments by `configureStore`, which will set up the
 * non-injected reducers, if any. It will be called again by the inject hook, with a table of
 * reducers to inject.
 */

export const createReducer = (injectedReducers=null) => injectedReducers | ifOk (
  (irs) => combineReducers ({ ...irs, }),
  () => id,
)

export const initStore = (initialState = {}) => {
  const middlewares = [
    sagaMiddleware,
  ]

  const enhancers = [
    applyMiddleware (...middlewares),
  ]

  return createStore (
    createReducer (),
    initialState,
    reduxCompose (...enhancers),
  ) | mergeM ({
    runSaga: sagaMiddleware.run,
    injectedReducers: {},
    injectedSagas: {},
  })
}
