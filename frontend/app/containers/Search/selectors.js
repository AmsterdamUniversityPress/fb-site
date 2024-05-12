import {
  pipe, compose, composeRight,
  map, prop,
  reduce,
} from 'stick-js/es'

import {} from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, foldWhenRequestResults, } from '../../common'

import { mapSetM, } from '../../util-general'

const { select, selectTop, selectVal, } = initSelectors (
  'Search',
  initialState,
)

// --- @todo consistent naming for selectors involving a request

const _selectFilters = selectVal ('filters')
export const selectResultsSearch = selectVal ('resultsSearch')
export const selectSearchBucket = selectVal ('searchBuckets')
export const selectNumResultsSearch = selectVal ('numResultsSearch')
export const selectQuery = selectVal ('querySearch')
export const selectFilterSearchParams = selectVal ('filterSearchParams')

export const selectFilters = select (
  'filters',
  _selectFilters,
  (filtersRequest) => filtersRequest | map (prop ('results'))
)

// @todo better name
export const selectFilterMap = select (
  'filterMap',
  [selectFilters],
  // (filters) => filters | map (
  (filters) => filters | foldWhenRequestResults (
    (lst) => lst | reduce (
      (filterMap, { name, options }) => filterMap | mapSetM (
        name,
        options | reduce (
          (optionMap, option) => optionMap | mapSetM (
            option, false), new Map)
      ), new Map)
  )
)
