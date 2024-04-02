import {
  pipe, compose, composeRight,
  noop,
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
  (rcomplete) => rcomplete,
  'loginUserCompleted',
)

export const loggedOutUser = action (
  () => {},
  'loggedOutUser',
)

// --- @todo change name to logInUser?
export const logIn = action (
  (email, password) => ({ email, password, }),
  'logIn',
)

export const logOut = action (
  () => {},
  'logOut',
)

export const passwordUpdate = action (
  (email, oldPassword, newPassword) => ({ email, oldPassword, newPassword, }),
  'passwordUpdate',
)

// @todo needs better name (what is the difference with completed?)
// used to put the passwordUpdated in the store back to requestInit
export const passwordUpdateDone = action (
  () => {},
  'passwordUpdateDone',
)

export const passwordUpdateCompleted = action (
  (rcomplete) => rcomplete,
  'passwordUpdateCompleted',
)

export const usersFetch = action (
  noop,
  'usersFetch',
)

export const usersFetchCompleted = action (
  (rcomplete) => rcomplete,
  'usersFetchCompleted',
)

export const sendWelcomeWelcomeEmail = action (
  (email) => email,
  'sendWelcomeWelcomeEmail',
)

export const sendWelcomeWelcomeEmailCompleted = action (
  (rcomplete, email) => ({ rcomplete, email, }),
  'sendWelcomeWelcomeEmailCompleted',
)

export const sendWelcomeResetEmail = action (
  (email) => email,
  'sendWelcomeResetEmail',
)

export const sendWelcomeResetEmailCompleted = action (
  (rcomplete, email) => ({ rcomplete, email, }),
  'sendWelcomeResetEmailCompleted',
)

export const userAdd = action (
  ( email, firstName, lastName, privileges ) => ({ email, firstName, lastName, privileges, }),
  'userAdd',
)

export const userAddCompleted = action (
  (rcomplete) => rcomplete,
  'userAddCompleted',
)

export const userAddStart = action (
  () => {},
  'userAddStart',
)

export const userRemove = action (
  (email) => email,
  'userRemove',
)

export const userRemoveCompleted = action (
  (rcomplete, email) => ({ rcomplete, email, }),
  'userRemoveCompleted',
)

export const resetPassword = action (
  (email, password, token, navigate) => ({ email, password, token, navigate }),
  'resetPassword',
)

export const resetPasswordCompleted = action (
  (rcomplete) => rcomplete,
  'resetPasswordCompleted',
)
