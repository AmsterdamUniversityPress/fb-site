import {
  pipe, compose, composeRight,
  noop,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { action, } from 'alleycat-js/es/redux'

export const autocompleteFetch = action (
  (query) => query,
  'autocompleteFetch',
)

export const autocompleteFetchCompleted = action (
  (rcomplete) => rcomplete,
  'autocompleteFetchCompleted',
)

export const autocompleteQueryUpdated = action (
  (query) => query,
  'autocompleteQueryUpdated',
)

export const clearFilters = action (
  (navigate) => navigate,
  'clearFilters',
)

// --- causes 2 queries to be fired, one for determining the search results and one for the buckets.
export const searchFetch = action (
  (query, filterSearchParams) => ({ query, filterSearchParams, }),
  'searchFetch',
)

export const searchFetchCompleted = action (
  (rcomplete) => rcomplete,
  'searchFetchCompleted',
)

export const searchBucketsFetchCompleted = action (
  (rcomplete) => rcomplete,
  'searchBucketsFetchCompleted',
)

export const searchReset = action (
  () => {},
  'searchReset',
)

export const updateFilterToggle = action (
  (navigate, filterName, value) => ({ navigate, filterName, value, }),
  'updateFilterToggle',
)

export const updateSearchQuery = action (
  (navigate, searchQuery) => ({ navigate, searchQuery, }),
  'updateSearchQuery',
)
