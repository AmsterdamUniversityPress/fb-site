import {
  pipe, compose, composeRight,
  add, whenOk, prop, defaultToV,
  map, ok, id
} from 'stick-js/es'

import { } from 'alleycat-js/es/bilby'
import { logWith, } from 'alleycat-js/es/general'
import { ifEquals, } from 'alleycat-js/es/predicate'
import { requestIsResults, } from 'alleycat-js/es/fetch'

import { initialState, } from './reducer'

import { initSelectors, } from '../../../../common'
import { nullMap, } from '../../../../util-general'

const { select, selectTop, selectVal, } = initSelectors (
  'ui',
  initialState,
)

const _selectPasswordUpdated = selectVal ('passwordUpdated')

export const selectPasswordUpdated = select (
  'selectPasswordUpdated',
  _selectPasswordUpdated,
  // --- map means take the RequestResults case
  (passwordUpdateRequest) => passwordUpdateRequest | requestIsResults
)

