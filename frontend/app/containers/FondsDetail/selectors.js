import {
  pipe, compose, composeRight,
  map, prop,
} from 'stick-js/es'

import { initialState, } from './reducer'

import { initSelectors, } from '../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'FondsDetail',
  initialState,
)

export const _selectFonds = selectVal ('fonds')

export const selectFonds = select (
  'selectFonds',
  [_selectFonds],
  (fondsRequest) => fondsRequest | map (prop ('results')),
)
