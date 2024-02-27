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

// export const hello = action (
  // () => {},
  // 'hello',
// )

// export const helloCompleted = action (
  // (loggedIn) => ({ loggedIn, }),
  // 'helloCompleted',
// )

export const loginLogoutCompleted = action (
  (user) => ({ user, }),
  'loginLogoutCompleted',
)

export const dataFetch = action (
  () => {},
  'dataFetch',
)

export const dataFetchCompleted = action (
  (rcomplete) => rcomplete,
  'dataFetchCompleted',
)

export const logIn = action (
  (email, password) => ({ email, password, }),
  'logIn',
)

export const logOut = action (
  () => {},
  'logOut',
)
