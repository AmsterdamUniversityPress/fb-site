import {
  pipe, compose, composeRight,
  map, prop, tap, reduce, remapTuples, nil,
  each, ifOk, recurry, invoke, dot1, id, eq,
} from 'stick-js/es'

import sortWith  from 'ramda/es/sortWith'

import { cata, } from 'alleycat-js/es/bilby'
import { logWith, } from 'alleycat-js/es/general'

import { initialState, } from './reducer-initial-state'

import { initSelectors, foldWhenRequestResults, } from '../../common'

import { flatten, mapRemapTuples, mapSetM, mapUpdate, setRemap, setToggle, } from '../../util-general'

const searchParamsGetAll = dot1 ('getAll')

const { select, selectTop, selectVal, } = initSelectors (
  'Search',
  initialState,
)

// --- @todo consistent naming for selectors involving a request

const _selectBuckets = selectVal ('buckets')
export const selectResults = selectVal ('results')

export const selectResultsAutocomplete = selectVal ('resultsAutocomplete')

export const selectNumResults = selectVal ('numResults')

export const selectQuery = selectVal ('querySearch')
export const selectQueryAutocomplete = selectVal ('queryAutocomplete')

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

const filterNamesAscend = invoke (() => {
  const filterNames = {
    naam_organisatie: 0,
    categories: 1,
    trefwoorden: 2,
    regios: 3,
  }
  return recurry (3) (
    (f) => (a) => (b) => filterNames [f (a)] - filterNames [f (b)],
  )
})

const sortBuckets = sortWith ([
  filterNamesAscend (([name, _]) => name),
])

export const selectFiltersWithCounts = select (
  'filtersWithCounts',
  [selectBuckets, selectFilterSearchParams],
  (bucketsRequest, searchParams) => bucketsRequest | map (
    /* [
     *   'categories', [{ key, doc_count, }, ...],
     *   'trefwoorden', ...,
     * ]
     */
    (buckets) => {
      const newBuckets = buckets | sortBuckets | map (
        ([filterName, data]) => {
          // --- build the map based on the returned buckets ...
          const newData = data | reduce (
            (filterMap, { key: value, doc_count, }) => filterMap | mapSetM (
              value, doc_count,
            ),
            new Map,
          )
          // --- ... but now we need to cycle through the searchParams, which contains the list of
          // currently selected filters, and manually add back the filters which have been selected
          // by the user but which were not returned by the search results, in other words, filters
          // which in the current configuration have a doc count of 0. If we don't do this the UI
          // gets confusing because a previously selected filter seems to disappear.
          searchParams | searchParamsGetAll (filterName) | each (
            (value) => newData.has (value) || newData.set (value, 0),
          )
          return [filterName, newData]
        },
      )

      return newBuckets
    },
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

export const selectSelectedFiltersTuplesWithUpdate = select (
  'selectedFiltersTuples',
  [selectSelectedFilters],
  (selectedFilters) => (updateSpec) => {
    const filters = updateSpec | ifOk (
      () => {
        const [filterName, value] = updateSpec
        return selectedFilters | mapUpdate (
          filterName, setToggle (value),
        )
      },
      () => selectedFilters,
    )
    return flatten (1) (filters | mapRemapTuples (
      (filterName, values) => values | setRemap (
        (value) => [filterName, value],
      )
    ))
  }
)

const selectSelectedFiltersTuples = select (
  'selectSelectedFiltersTuples',
  [selectSelectedFiltersTuplesWithUpdate],
  (selector) => selector (),
)

export const selectHasSelectedFilters = select (
  'selectHasSelectedFilters',
  [selectSelectedFiltersTuples],
  (tuples) => tuples.length !== 0,
)

export const selectLastUpdatedFilterName = selectVal ('lastUpdatedFilterName')
