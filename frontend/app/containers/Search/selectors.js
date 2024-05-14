import {
  pipe, compose, composeRight,
  map, prop, tap, reduce, remapTuples, nil,
  each,
} from 'stick-js/es'

import { cata, } from 'alleycat-js/es/bilby'
import { logWith, } from 'alleycat-js/es/general'

import { initialState, } from './reducer-initial-state'

import { initSelectors, foldWhenRequestResults, } from '../../common'

import { mapSetM, } from '../../util-general'

const { select, selectTop, selectVal, } = initSelectors (
  'Search',
  initialState,
)

// --- @todo consistent naming for selectors involving a request

const _selectBuckets = selectVal ('buckets')
export const selectResults = selectVal ('results')

export const selectNumResults = selectVal ('numResults')
export const selectQuery = selectVal ('querySearch')
export const selectFilterSearchParams = selectVal ('filterSearchParams')

const selectBuckets = select (
  'buckets',
  [_selectBuckets],
  (bucketsRequest) => bucketsRequest | map (
    /* {
     *   categories: [{ key, doc_count, }, ...],
     *   trefwoorden: [...],
     * }
     */
    (buckets) => buckets | remapTuples (
      (k, v) => [k, v],
    ),
  ),
)

export const selectFiltersWithCounts = select (
  'filtersWithCounts',
  [selectBuckets],
  (bucketsRequest) => bucketsRequest | map (
    /* [
     *   'categories', [{ key, doc_count, }, ...],
     *   'trefwoorden', ...,
     * ]
     */
    (buckets) => buckets | map (
      ([name, data]) => [name, data | reduce (
        (filterMap, { key, doc_count, }) => filterMap | mapSetM (
          key, doc_count,
        ),
        new Map,
      )],
    ),
  ),
)

// --- toch niet nodig
export const selectFilterValues = select (
  'filterValues',
  [selectFiltersWithCounts],
  (filtersWithCountsReq) => filtersWithCountsReq | map (
    (filters) => filters | map (
      ([name, counts]) => [name, [... counts.keys ()]],
    ),
  ),
)

export const selectFilterNames = select (
  'filterNames',
  [selectFiltersWithCounts],
  (filtersWithCountsReq) => filtersWithCountsReq | map (
    (filters) => filters | map (
      ([name, _]) => name,
    ),
  ),
)

export const selectSelectedFilters = select (
  'selectedFilters',
  [selectFilterNames, selectFilterSearchParams],
  (filterNames, params) => {
    const ret = new Map
    if (nil (params)) return ret
    filterNames | foldWhenRequestResults (each (
      (filterName) => ret.set (filterName, new Set (params.getAll (filterName))),
    ))
    return ret
  }
)
