import {
  pipe, compose, composeRight,
} from 'stick-js'

import { realpathSync as realpath, } from 'fs'
import { join as pathJoin, } from 'path'

import { __dirname, } from './util.mjs'

const rootDir = realpath (pathJoin (__dirname (import.meta.url), '..'))
const dbDir = pathJoin (rootDir, 'db')
const dbPath = pathJoin (dbDir, 'main.db')

export const config = {
  dbPath,
  serverPort: 4444,
}
