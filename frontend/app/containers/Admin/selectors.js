import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { createSelector, defaultMemoize as memoize, } from 'reselect'

import {} from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, } from '../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'Admin',
  initialState,
)
