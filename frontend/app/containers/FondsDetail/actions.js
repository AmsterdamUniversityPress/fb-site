import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { action, } from 'alleycat-js/es/redux'

export const fondsDetailFetch = action (
  (uuid) => uuid,
  'fondsDetailFetch',
)

export const fondsDetailFetchCompleted = action (
  (rcomplete) => rcomplete,
  'fondsDetailFetchCompleted',
)
