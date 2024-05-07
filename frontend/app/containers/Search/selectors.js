import {
  pipe, compose, composeRight,
  map, prop,
} from 'stick-js/es'

import {} from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, } from '../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'Search',
  initialState,
)

export const selectResultsAutocomplete = selectVal ('resultsAutocomplete')

// --- @todo consistent naming for selectors involving a request

export const selectResultsSearch = selectVal ('resultsSearch')
export const selectNumResultsSearch = selectVal ('numResultsSearch')
export const selectQuery = selectVal ('querySearch')
export const selectFilterSearchParams = selectVal ('filterSearchParams')
