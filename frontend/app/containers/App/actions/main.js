import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { action, } from 'alleycat-js/es/redux'

export const halt = action (
  () => {},
  'halt',
)

export const appMounted = action (
  () => {},
  'appMounted',
)

export const fondsenFetch = action (
  (pageNum) => pageNum,
  'fondsenFetch',
)

export const fondsenFetchCompleted = action (
  (rcomplete) => rcomplete,
  'fondsenFetchCompleted',
)

export const loggedInInstitution = action (
  (user) => user,
  'loggedInInstitution',
)

export const loginUserCompleted = action (
  (user) => user,
  'loginUserCompleted',
)

export const loggedOutUser = action (
  () => {},
  'loggedOutUser',
)

export const logIn = action (
  (email, password) => ({ email, password, }),
  'logIn',
)

export const logOut = action (
  () => {},
  'logOut',
)

export const passwordUpdate = action (
  (email, password) => ({ email, password, }),
  'passwordUpdate',
)
