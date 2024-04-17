import {
  pipe, compose, composeRight,
} from 'stick-js'

import { Nothing, } from 'alleycat-js/es/bilby'
import { __dirname, } from './util.mjs'

export const config = () => ({
  activateTokenExpireSecs: 3 * 24 * 3600,
  activateTokenLength: 32,
  // --- currently 1 day, make more when we're in production
  cookieMaxAgeMs: 24 * 3600 * 1000,
  jwtSecret: Nothing,
  minimumPasswordScore: 4,
  schemaVersion: 3,
  // --- needs to be just a bit longer than cookieMaxAgeMs (1 hour is
  // plenty); the user cookie will have expired so it's safe to clear old
  // rows from the session table
  getStaleSessionSecs: () => config ().cookieMaxAgeMs + 3600,
  staleSessionCheckTimeoutMs: 1000 * 3600,
})
