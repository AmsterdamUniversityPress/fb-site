import {
  pipe, compose, composeRight,
  sprintf1, tryCatch, lets, id, nil,
  ifOk, gt, tap, againstAny, eq, die, each,
  appendM, find, whenOk, ok, not,
  concatTo,
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
import { dataTst, dataAcc, dataPrd, } from './data.mjs'
import { init as initDb,
  // userAdd as dbUserAdd,
  userGet as dbUserGet,
  userIdGet as dbUserIdGet,
  // userPasswordUpdate as dbUserPasswordUpdate,
  loggedInAdd as dbLoggedInAdd,
  loggedInRemove as dbLoggedInRemove,
  loggedInGet as dbLoggedInGet,
} from './db.mjs';
import { errorX, warn, } from './io.mjs'
import { env, envOrConfig, ifMapHas, lookupOnOrDie, mapTuplesAsMap, } from './util.mjs'

import {
  authFactory,
// } from 'alleycat-express-jwt'
} from './alleycat-express-jwt/index.mjs'

const configTop = config | configure.init

const { authorizeByIP, serverPort, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets (
    'authorizeByIP',
    'serverPort',
  ),
)

const jwtSecret = lets (
  () => ['must be longer than 25 characters', length >> gt (25)],
  (validate) => envOrConfig (configTop, 'jwtSecret', 'JWT_SECRET', validate),
)

const cookieSecret = lets (
  () => ['must be longer than 25 characters', length >> gt (25)],
  (validate) => envOrConfig (configTop, 'cookieSecret', 'COOKIE_SECRET', validate),
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

    auth | each (({ name, contact, type, ip_type, details, }) => {
      const blockListFunction = type | lookupOnOrDie ('bad type: ' + type) ({
        address: 'addAddress',
        subnet: 'addSubnet',
        range: 'addRange',
      })
      const typeParam = ip_type | lookupOnOrDie ('bad ip_type: ' + ip_type) ({
        v4: 'ipv4',
        v6: 'ipv6',
      })
      const listRule = new net.BlockList ()
      ; [listMain, listRule] | each (
        (list) => list [blockListFunction] (... details, typeParam),
      )
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
  // --- one big structure which can efficiently check if an IP is authorized
  _listMain: void 8,
  // --- a list of structures, one per rule, through which we inefficiently
  // loop so we can map institution data to an IP address.
  _lists: void 8,
}

const allowedIPs = authIP.init (authorizeByIP)

// --- (String, Buffer) => Boolean
const checkPassword = (testPlain, knownHashed) => bcrypt.compareSync (testPlain, knownHashed)

const foldDbResults = (dbFuncName) => fold (
  (err) => {
    warn (err | concatTo ('Error with ' + dbFuncName + ': '))
    return null
  },
  ifOk (
    // for now, we just use id (we could consider a 'compose' function).
    ( x ) => {
      console.log ('Hello from fold')
      return x
    },
    () => null
  )
)

const doDbCall = (dbFunc, vals) => dbFunc (...vals) | foldDbResults (dbFunc.name)

const getUserId = (email) =>  doDbCall (dbUserIdGet, [ email, ]) | (({ id }) => id)
const getLoggedIn = (userId) => doDbCall (dbLoggedInGet, [ userId, ]) | (({ id }) => id)
const addLoggedIn = (userId) => doDbCall (dbLoggedInAdd, [ userId, ])
const removeLoggedIn = (id) => doDbCall (dbLoggedInRemove, [ id, ])

// --- must return { password, userinfo, }, where userinfo is an arbitrary
// structure which will be made available to the frontend, or `null`
const getUserinfoLogin = (email) => doDbCall (dbUserGet, [ email, ])
  | (({ email, firstName, lastName, password, }) => ({
    password,
    userinfo: {
      type: 'user',
      email,
      firstName,
      lastName,
    },
  }))

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

const xcheckPrivileges = (email, req) => lets (
  () => getPrivilegesForRequest (req),
  () => getPrivilegesForUser (email),
  (need, got) => need | isSubsetOf (got),
)

const checkPrivileges = () => true

const alleycatAuth = authFactory.create ().init ({
  checkPassword,
  getUserinfoLogin,
  getUserinfoRequest,
  isAuthorized: async (email, _, req) => {
    const { path, } = req.route
    const userId = getUserId (email)
    // if db error, die (...)
    if (!getLoggedIn (userId)) return [false, 'not logged in']
    if (not (checkPrivileges (email, req)))
      return [false, 'missing privileges for this route']
    return [true]
  },
  // --- note that in IP-based mode you can not access any admin routes (we
  // do not even know who you are).
  isAuthorizedAfterJWT: async (req) => {
    if (req.query ['disable-ip-authorize'] === '1')
      return [false, 'disable-ip-authorize=1']
    return allowedIPs.checkProxyIP (req)
  },
  jwtSecret,
  onLogin: async (email, _user) => {
    email | getUserId | addLoggedIn
  },
  onLogout: async (email) => {
    // have email, want to get id of loggedIn, and remove it
    // this seems like a lot of db calls to me?
    // we could replace the email value by userId perhaps?
    const loggedInId = email | getUserId | getLoggedIn
    if (!removeLoggedIn (loggedInId))
      die ('Unexpected, ' + email + ' not found in `loggedIn`')
  },
  usernameField: 'email',
})

const useAuthMiddleware = alleycatAuth.getUseAuthMiddleware ()
const secureGet = alleycatAuth.secureMethod () ('get')
const securePatch = alleycatAuth.secureMethod () ('patch')

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
  | securePatch ('/user', (req, _res) => {
    const { body, } = req
    const { data, } = body
    const { email, password } = data
    console.log ('email', email)
    console.log ('password', password)
    // @todo update db
  })
  | listen (port) (() => {
    String (port) | green | sprintf1 ('listening on port %s') | info
  })

init ({ port: serverPort, })
