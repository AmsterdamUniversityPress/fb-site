import {
  pipe, compose, composeRight,
  ok, prop, map,
} from 'stick-js/es'

import { createSelector, defaultMemoize as memoize, } from 'reselect'

import { fold, foldMaybe, isJust, toJust, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { foldIfRequestResults, } from 'alleycat-js/es/fetch'
import { logWith, ierror, reduceX, } from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, nullMap, } from '../../../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'app',
  initialState,
)

// --- returns Request which wraps (user | null)
export const selectUser = selectVal ('user')

// --- returns Request which wraps (true | false)
export const selectLoggedIn = select (
  'selectLoggedIn',
  [selectUser],
  // --- map means take the RequestResults case
  (user) => user | map (ok),
)

export const selectLoggedInDefaultFalse = select (
  'selectLoggedInDefaultFalse',
  [selectUser],
  (user) => user | foldIfRequestResults (
    (yesNo) => yesNo,
    () => false,
  ),
)

export const selectGetFirstName = select (
  'selectGetFirstName',
  [selectUser],
  (user) => () => user | toJust | prop ('firstName'),
)