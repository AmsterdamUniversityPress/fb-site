import {
  pipe, compose, composeRight,
  ok, prop,
} from 'stick-js/es'

import { createSelector, defaultMemoize as memoize, } from 'reselect'

import { fold, toJust, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { logWith, ierror, reduceX, } from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, nullMap, } from '../../../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'app',
  initialState,
)

const selectUser = selectVal ('user')

export const selectLoggedIn = select (
  'selectLoggedIn',
  [selectUser],
  ok,
)

export const selectFirstName = select (
  'selectFirstName',
  [selectUser],
  (user) => user | nullMap (prop ('firstName')),
)
