// ------ sending a 'slice' parameter to a selector function is a way to get it to accept a more
// specific chunk of the reducer: useful for calling the selector from the reducer.

import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { createSelector, defaultMemoize as memoize, } from 'reselect'

import memoize1 from 'memoize-one'

import { fold, toJust, cata, } from 'alleycat-js/es/bilby'
import { info, logWith, ierror, reduceX, min, max, roundUp, slice, } from 'alleycat-js/es/general'
import { ifEmptyList, } from 'alleycat-js/es/predicate'

import { initialState, } from './reducer'

import { initSelectors, } from '../../../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'domain',
  initialState,
)

export const selectError = selectVal ('error')

export const selectData = selectVal ('data')
