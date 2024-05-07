import {
  pipe, compose, composeRight,
  noop,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { action, } from 'alleycat-js/es/redux'

export const querySelected = action (
  (query) => query,
  'querySelected',
)
export const queryUpdated = action (
  (query) => query,
  'queryUpdated',
)

export const autocompleteFetch = action (
  (query) => query,
  'autocompleteFetch',
)

export const autocompleteFetchCompleted = action (
  (rcomplete) => rcomplete,
  'autocompleteFetchCompleted',
)

export const searchFetch = action (
  (query, filterSearchParams) => ({ query, filterSearchParams, }),
  'searchFetch',
)

export const searchFetchCompleted = action (
  (rcomplete) => rcomplete,
  'searchFetchCompleted',
)

export const searchReset = action (
  () => {},
  'searchReset',
)
