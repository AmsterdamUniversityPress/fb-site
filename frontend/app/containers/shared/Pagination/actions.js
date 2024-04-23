import {
  pipe, compose, composeRight,
  tap,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { action, } from 'alleycat-js/es/redux'

export const setNumItems = action (
  (key, n) => ({ key, n, }),
  'setNumItems',
)

export const setNumPerPageIdx = action (
  (key, n) => ({ key, n, }),
  'setNumPerPageIdx',
)

export const setPage = action (
  (key, page) => ({ key, page, }),
  'setPage',
)
