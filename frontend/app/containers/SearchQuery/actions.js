import {
  pipe, compose, composeRight,
  noop,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { action, } from 'alleycat-js/es/redux'

export const queryUpdated = action (
  (query) => query,
  'queryUpdated',
)

export const execute = action (
  (query) => query,
  'execute',
)

export const executeCompleted = action (
  (rcomplete) => rcomplete,
  'executeCompleted',
)
