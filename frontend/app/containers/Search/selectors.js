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

const _selectResultsSearch = selectVal ('resultsSearch')

export const selectResultsSearch = select (
  'resultsSearch',
  _selectResultsSearch,
  (searchResultRequest) => searchResultRequest | map (prop ('results'))
)
