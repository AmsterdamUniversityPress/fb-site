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

export const executeAutocompleteCompleted = action (
  (rcomplete) => rcomplete,
  'executeAutocompleteCompleted',
)

export const searchFetch = action (
  (query) => query,
  'searchFetch',
)

export const searchFetchCompleted = action (
  (rcomplete) => rcomplete,
  'searchFetchCompleted',
)
