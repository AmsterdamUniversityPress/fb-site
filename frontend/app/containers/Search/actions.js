import {
  pipe, compose, composeRight,
  noop,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { action, } from 'alleycat-js/es/redux'

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

export const updateFilterToggle = action (
  (navigate, filterName, value) => ({ navigate, filterName, value, }),
  'updateFilterToggle',
)
