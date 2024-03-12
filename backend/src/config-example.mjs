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
  authorizeByIP: [
    /*
    {
      name: 'Openbare Bibliotheek Amsterdam',
      contact: { email: 'ict@oba.nl', },
      type: 'subnet',
      details: ['xx.xx.xx.xx', 24],
    },
    {
      name: 'Leiden University Press',
      contact: { email: 'ict@leidenuniv.nl', },
      type: 'range',
      details: ['xx.xx.xx.yy', 'xx.xx.xx.zz'],
    },
    */
  ],
}
