// ------ sending a 'slice' parameter to a selector function is a way to get it to accept a more
// specific chunk of the reducer: useful for calling the selector from the reducer.

import {
  pipe, compose, composeRight,
  map, prop, path, tap,
  ok, reduce,
} from 'stick-js/es'

import { initialState, } from './reducer'

import { length, logWith, } from 'alleycat-js/es/general'

import { foldWhenRequestResults, toRequestResults, initSelectors, } from '../../../../common'

import {
  mapSetM,
} from '../../../../util-general'

const { select, selectTop, selectVal, } = initSelectors (
  'domain',
  initialState,
)

export const selectError = selectVal ('error')

/*
 * Request ({
 *   metadata: { totalAvailable, },
 *   results: [...],
 * })
 */
const _selectFondsen = selectVal ('fondsen')

export const selectFondsen = select (
  'selectFondsen',
  _selectFondsen,
  (fondsenRequest) => fondsenRequest | map (prop ('results')),
)

export const selectNumFondsen = selectVal ('numFondsen')
