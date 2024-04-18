import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import {} from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, } from '../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'Search',
  initialState,
)

export const selectResults = selectVal ('results')
