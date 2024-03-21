import {
  pipe, compose, composeRight,
  tap,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { action, } from 'alleycat-js/es/redux'

export const setNumPerPageIdx = action (
  (n) => n,
  'setNumPerPageIdx',
)

export const setPage = action (
  (page) => page,
  'setPage',
)
