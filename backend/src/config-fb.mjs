import {
  pipe, compose, composeRight,
} from 'stick-js'

import { realpathSync as realpath, } from 'fs'
import { join as pathJoin, } from 'path'

import { Nothing, } from 'alleycat-js/es/bilby'
import { __dirname, } from './util.mjs'

const rootDir = realpath (pathJoin (__dirname (import.meta.url), '..'))

export const config = {
  activateTokenExpireSecs: 3 * 24 * 3600,
  activateTokenLength: 32,
  // --- currently 1 day, make more when we're in production
  cookieMaxAgeMs: 24 * 3600 * 1000,
  jwtSecret: Nothing,
  minimumPasswordScore: 4,
  schemaVersion: 1,
}
