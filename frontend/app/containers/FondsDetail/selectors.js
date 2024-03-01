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

export const _selectFondsDetail = selectVal ('fondsDetail')

export const selectFondsDetail = select (
  'selectFondsDetail',
  _selectFondsDetail,
  (fondsDetailRequest) => fondsDetailRequest | map (prop ('results')),
)
