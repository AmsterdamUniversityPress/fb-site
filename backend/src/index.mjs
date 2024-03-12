import {
  pipe, compose, composeRight,
  sprintf1, tryCatch, lets, id, nil,
  ifOk, gt, tap, againstAny, eq, die, each,
  appendM, find, whenOk, ok,
} from 'stick-js/es'

import net from 'net'

import bcrypt from 'bcrypt'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import express from 'express'

import { listen, use, sendStatus, } from 'alleycat-js/es/express'
import { yellow, green, red, } from 'alleycat-js/es/io';
import { decorateRejection, info, length, logWith, } from 'alleycat-js/es/general';
import { fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'

import { config, } from './config.mjs'
import { init as initDb,
  // userAdd as dbUserAdd,
  userGet as dbUserGet,
  // userPasswordUpdate as dbUserPasswordUpdate,
} from './db.mjs';
import { errorX, warn, } from './io.mjs'
import { env, ifMapHas, lookupOnOrDie, mapTuplesAsMap, } from './util.mjs'

import {
  authFactory,
// } from 'alleycat-express-jwt'
} from './alleycat-express-jwt/index.mjs'

import dataTst from '../../__data/fb-data-tst.json' with { type: 'json', }
import dataAcc from '../../__data/fb-data-acc.json' with { type: 'json', }
import dataPrd from '../../__data/fb-data-prd.json' with { type: 'json', }

const configTop = config | configure.init

const { authorizeByIP, dbPath, serverPort, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets (
    'authorizeByIP',
    'dbPath',
    'serverPort',
  ),
)

const jwtSecret = lets (
  () => ['must be longer than 25 characters', length >> gt (25) ],
  (validate) => env ('JWT_SECRET', validate),
)

const cookieSecret = lets (
  () => ['must be longer than 25 characters', length >> gt (25) ],
  (validate) => env ('COOKIE_SECRET', validate),
)

const appEnv = lets (
  () => [
    'must be tst|acc|prd',
    againstAny ([eq ('tst'), eq ('acc'), eq ('prd')]),
  ],
  (validate) => env ('APP_ENV', validate),
)

const data = appEnv | lookupOnOrDie (
  'ierror appEnv',
  { tst: dataTst, acc: dataAcc, prd: dataPrd, }
)

const dataByUuid = data | mapTuplesAsMap ((_, v) => [v.uuid, v])

const hashPassword = (pw, saltRounds=10) => bcrypt.hashSync (pw, saltRounds)

initDb (hashPassword)

const authIP = {
  init (auth) {
    // --- it's called BlockList but can be used to simply check IPs in ranges
    const listMain = new net.BlockList ()
    this._lists = []
    this._infoCache = new Map ()

    auth | each (({ name, contact, type, details, }) => {
      const f = type | lookupOnOrDie ('bad type: ' + type) ({
        subnet: 'addSubnet',
        range: 'addRange',
      })
      const listRule = new net.BlockList ()
      listMain [f] (... details)
      listRule [f] (... details)
      this._lists | appendM ({ name, contact, list: listRule, })
    })

    this._listMain = listMain
    return this
  },
  check (ip) { return this._listMain.check (ip) },
  checkProxyIP (req) {
    const clientIP = this._ipForRequest (req)
    if (nil (clientIP)) return [false, 'no X-Forwarded-For header']
    return [this.check (clientIP), null]
  },
  getInfo (req) {
    const clientIP = this._ipForRequest (req)
    if (nil (clientIP)) return null
    const cached = this._infoCache.get (clientIP)
    if (ok (cached)) return cached
    return this._lists
      | find (({ list, ..._ }) => list.check (clientIP))
      | whenOk (({ name, contact, ... _ }) => ({ name, contact, }))
      | whenOk ((info) => {
        this._infoCache.set (clientIP, info)
        return info
      })
  },
  _ipForRequest (req) {
    // --- note that X-Forwarded-For is really easy to forge, so you must be
    // sure you trust the reverse proxy server.
    return req.headers ['x-forwarded-for']
  },
  _infoCache: void 8,
  // --- one big structure which can quickly check if an IP is authorized
  _listMain: void 8,
  // --- a list of structures, one per rule, through which we inefficiently
  // loop so we can map institution data to an IP address.
  _lists: void 8,
}

const allowedIPs = authIP.init (authorizeByIP)

// --- @todo persist in sqlite
const loggedIn = new Set ()

// --- (String, Buffer) => Boolean
const checkPassword = (testPlain, knownHashed) => bcrypt.compareSync (testPlain, knownHashed)

// --- must return { password, userinfo, }, where userinfo is an arbitrary
// structure which will be made available to the frontend, or `null`
const getUserinfoLogin = (email) => {
  const user = dbUserGet (email)
  return user | fold (
    // --- DB/IO error
    (e) => {
      warn ('Unable to get user:', e)
      return null
    },
    ifOk (
      ({ email, firstName, lastName, password, }) => ({
          password,
          userinfo: {
            type: 'user',
            email,
            firstName,
            lastName,
          },
        }),
      // --- invalid login
      () => null,
    )
  )
}

const getUserinfoRequest = (req) => {
  const info = authIP.getInfo (req)
  if (nil (info)) {
    warn ('getUserinfoRequest (): null info')
    return null
  }
  const { name, contact, } = info
  if (nil (name) || nil (contact)) {
    warn ('getUserinfoRequest (): null name/contact')
    return null
  }
  return { name, contact, type: 'institution', }
}

const alleycatAuth = authFactory.create ().init ({
  checkPassword,
  getUserinfoLogin,
  getUserinfoRequest,
  isAuthorized: async (email, _, req) => {
    const { path, } = req.route
    // console.log ('todo checking authorized for path', path)
    // if db error, die (...)
    if (!loggedIn.has (email)) return [false, 'not logged in']
    return [true]
  },
  isAuthorizedAfterJWT: async (req) => {
    if (req.query ['disable-ip-authorize'] === '1')
      return [false, 'disable-ip-authorize=1']
    return allowedIPs.checkProxyIP (req)
  },
  jwtSecret,
  onLogin: async (email, _user) => {
    loggedIn.add (email)
  },
  onLogout: async (email) => {
    if (!loggedIn.delete (email))
      die ('Unexpected, ' + email + ' not found in `loggedIn`')
  },
  usernameField: 'email',
})

const useAuthMiddleware = alleycatAuth.getUseAuthMiddleware ()
const secureGet = alleycatAuth.secureMethod () ('get')

const init = ({ port, }) => express ()
  | use (bodyParser.json ())
  | use (cookieParser (cookieSecret))
  | useAuthMiddleware
  | secureGet ('/fondsen', (req, res) => {
    const { query, } = req
    const { beginIdx, number, } = query
    // --- @todo check / validate query
    res | sendStatus (200, {
      metadata: {
        totalAvailable: data.length,
      },
      results: data.slice (beginIdx, beginIdx + Number (number)),
    })
  })
  | secureGet ('/fonds', (req, res) => {
    const { query, } = req
    const { uuid, } = query
    // --- @todo check / validate
    console.log ('uuid', uuid)
    res | sendStatus (
      ... dataByUuid | ifMapHas (uuid) (
        (fonds) => [200, { results: fonds, }],
        () => [499, { umsg: 'No such uuid ' + uuid, }],
      ),
    )
  })
  | listen (port) (() => {
    String (port) | green | sprintf1 ('listening on port %s') | info
  })

init ({ port: serverPort, })
