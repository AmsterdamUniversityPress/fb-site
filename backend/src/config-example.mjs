import {
  pipe, compose, composeRight,
} from 'stick-js'

import { realpathSync as realpath, } from 'node:fs'
import { join as pathJoin, } from 'node:path'

import { Nothing, } from 'alleycat-js/es/bilby'
import { __dirname, } from './util.mjs'

const rootDir = realpath (pathJoin (__dirname (import.meta.url), '..'))
const dbDir = pathJoin (rootDir, 'db')
const dbPath = pathJoin (dbDir, 'main.db')

export const config = {
  dbPath,
  cookieSecret: Nothing,
  email: {
    host: 'smtp.mailserver.xx',
    // --- combination of port=587, secure=false and requireTLS=true should make it use SMARTTLS
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: 'xxx@yourdomain.xx',
      pass: 'xxx',
    },
    fromString: '"Your Name" <xxx@yourdomain.xx>',
  },
  jwtSecret: Nothing,
  serverPort: 4444,
  authorizeByIP: [
    /*
    {
      name: 'Openbare Bibliotheek Amsterdam',
      contact: { email: 'ict@oba.nl', },
      type: 'address',
      ip_type: 'v4', // or 'v6'
      details: ['xx.xx.xx.yy'],
    },
    {
      name: 'Leiden University Press',
      contact: { email: 'ict@leidenuniv.nl', },
      type: 'range',
      ip_type: 'v4', // or 'v6'
      details: ['xx.xx.xx.yy', 'xx.xx.xx.zz'],
    },
    {
      name: 'Bij mij thuis',
      contact: { email: 'ict@bij-mij.nl', },
      type: 'subnet',
      ip_type: 'v4', // or 'v6'
      details: ['xx.xx.xx.xx', 24],
    },
    */
  ],
}
