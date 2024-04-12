import {
  pipe, compose, composeRight,
  tap, map, split, containsV, lets,
} from 'stick-js/es'

import { createSelector, } from 'reselect'

import { requestIsPending, requestIsResults, } from 'alleycat-js/es/fetch'
import { logWith, } from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, } from '../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'Admin',
  initialState,
)

export const selectUsers = selectVal ('users')

export const selectUsersComponent = select (
  'usersComponent',
  [selectUsers],
  (users) => users | map (
    (data) => data | map (
      ({ email, firstName, lastName, isActive, privileges, }) => lets (
        () => privileges | split (',') | containsV ('admin-user'),
        (isAdminUser) => ({ email, firstName, lastName, isActive, isAdminUser, })
      ),
    ),
  ),
)

export const selectEmailRequestPending = selectVal ('emailRequestPending')
export const selectUserAddRequest = selectVal ('userAddRequest')
export const selectUserRemoveRequest = selectVal ('userRemoveRequest')
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
export const selectUserRemovePending = select (
  'userRemovePending',
  [selectUserRemoveRequest],
  (req) => req | requestIsPending,
)
export const selectUserRemovePendingUsers = selectVal ('userRemovePendingUsers')
