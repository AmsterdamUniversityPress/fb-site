import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { createSelector, } from 'reselect'

import { requestIsPending, requestIsResults, } from 'alleycat-js/es/fetch'
import {} from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, requestIsInit, } from '../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'Admin',
  initialState,
)

export const selectUsers = selectVal ('users')
export const selectEmailRequestPending = selectVal ('emailRequestPending')
export const selectUserAddRequest = selectVal ('userAddRequest')
export const selectUserAddIdle = select (
  'userAddIdle',
  [selectUserAddRequest],
  (req) => req | requestIsInit,
)
export const selectUserAddPending = select (
  'userAddPending',
  [selectUserAddRequest],
  (req) => req | requestIsPending,
)
export const selectUserAddSuccess = select (
  'userAddSuccess',
  [selectUserAddRequest],
  (req) => req | requestIsResults,
)
export const selectUserRemovePending = selectVal ('userRemovePending')
