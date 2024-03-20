import {
  pipe, compose, composeRight,
  sprintf1, tryCatch, lets, id, nil, tap, ok,
  gt, againstAny, eq, die,
  not, concatTo, recurry, ifOk, ifNil,
} from 'stick-js/es'

import bcrypt from 'bcrypt'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import express from 'express'

import { listen, use, sendStatus, sendStatusEmpty, } from 'alleycat-js/es/express'
import { green, } from 'alleycat-js/es/io';
import { decorateRejection, info, length, logWith, } from 'alleycat-js/es/general'
import { fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'

import { authIP as authIPFactory, } from './auth-ip.mjs'
import { config, } from './config.mjs'
import { dataTst, dataAcc, dataPrd, } from './data.mjs'
import { init as initDb,
  // userAdd as dbUserAdd,
  userGet as dbUserGet,
  userPasswordUpdate as dbUserPasswordUpdate,
  loggedInAdd as dbLoggedInAdd,
  loggedInRemove as dbLoggedInRemove,
  loggedInGet as dbLoggedInGet,
} from './db.mjs';
import { errorX, warn, } from './io.mjs'
import {
  env, envOrConfig, ifMapHas,
  isNonNegativeInt, isPositiveInt, isSubsetOf,
  lookupOnOrDie, mapTuplesAsMap, decorateAndRethrow,
} from './util.mjs'
import { getAndValidateQuery, } from './util-express.mjs'

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

const authIP = authIPFactory.create ().init (authorizeByIP)

// --- (String, Buffer) => Boolean
const checkPassword = (testPlain, knownHashed) => bcrypt.compareSync (testPlain, knownHashed)

const foldDbResults = (onError, dbFuncName) => fold (
  onError,
  id,
)

const doDbCall = recurry (3) (
  (onError) => (dbFunc) => (vals) => dbFunc (...vals) | foldDbResults (onError, dbFunc.name),
)

const decorateDbError = (err, dbFuncName) => err | concatTo ('Error with ' + dbFuncName + ': ')
const warnNull = (err, dbFuncName) => {
  warn (decorateDbError (err, dbFuncName))
  return null
}

const doDbCallWarnNull = (dbFunc, vals) => doDbCall (
  (err) => warnNull (err, dbFunc.name),
  dbFunc,
  vals,
)
const doDbCallDie = (dbFunc, vals) => doDbCall (
  (err) => die (decorateDbError (err, dbFunc.name)),
  dbFunc,
  vals,
)

// --- @throws
const getLoggedIn = (email) => doDbCallDie (dbLoggedInGet, [ email, ])
// --- @throws
const addLoggedIn = (email) => doDbCallDie (dbLoggedInAdd, [ email, ])
// --- @throws
const removeLoggedIn = (email) => doDbCallDie (dbLoggedInRemove, [ email, ])
const updateUserPassword = (email, pw) => doDbCallWarnNull (dbUserPasswordUpdate, [email, pw])

// --- must return { password, userinfo, }, where userinfo is an arbitrary
// structure which will be made available to the frontend, or `null`
const getUserinfoLogin = (email) => doDbCallWarnNull (dbUserGet, [ email, ])
  | (({ email, firstName, lastName, password, }) => ({
    password,
    userinfo: {
      type: 'user',
      email,
      firstName,
      lastName,
    },
  }))

const getUserPassword = (email) => email | getUserinfoLogin
  | (({ password, _userinfo }) => password)

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

const getPrivilegesForUser = (email) => email | ifNil (
  // --- null user means IP-based authentication.
  () => new Set (['user']),
  lookupOnOrDie (
    'getPrivilegesForUser (): invalid user: ' + email,
  ) ({
    'allen@alleycat.cc': new Set (['user']),
    'arie@alleycat.cc': new Set (['user', 'admin-user']),
  }),
)

const checkPrivileges = (email, privsNeed=null) => lets (
  () => getPrivilegesForUser (email),
  (privsGot) => privsNeed | ifOk (
    isSubsetOf (privsGot),
    () => true,
  ),
)

const alleycatAuth = authFactory.create ().init ({
  authorizeDataDefault: new Set (),
  checkPassword,
  getUserinfoLogin,
  getUserinfoRequest,
  isAuthorized: async (email, req, privileges=null) => {
    // --- `privileges` may be null, but we want to make sure it's always explicitly set to
    // something (we use the empty set to mean no / open authorization)
    if (nil (privileges)) die ('isAuthorized (): privileges is nil')
    if (not (checkPrivileges (email, privileges)))
      return [false, 'missing privileges for this route']
    return [true]
  },
  isLoggedIn: async (email, _, req) => {
    const { path, } = req.route
    if (!getLoggedIn (email)) return [false, 'not logged in']
    return [true]
  },
  // --- note that in IP-based mode you can not access any admin routes (we
  // do not even know who you are).
  isLoggedInAfterJWT: async (req) => {
    if (req.query ['disable-ip-authorize'] === '1')
      return [false, 'disable-ip-authorize=1']
    return authIP.checkProxyIP (req)
  },
  jwtSecret,
  onLogin: async (email, _user) => {
    addLoggedIn (email)
  },
  onLogout: async (email) => {
    decorateAndRethrow (
      'Unexpected, ' + email + ' not found in `loggedIn`: ',
      () => removeLoggedIn (email),
    )
  },
  usernameField: 'email',
})

const useAuthMiddleware = alleycatAuth.getUseAuthMiddleware ()
const secureGet = (privs) => alleycatAuth.secureMethod ({ authorizeData: privs, }) ('get')
const securePatch = (privs) => alleycatAuth.secureMethod ({ authorizeData: privs, }) ('patch')

const privsUser = new Set (['user'])
const privsAdminUser = new Set (['admin-user'])

const init = ({ port, }) => express ()
  | use (bodyParser.json ())
  | use (cookieParser (cookieSecret))
  | useAuthMiddleware
  | secureGet (privsUser) ('/fondsen', getAndValidateQuery ([
      ['beginIdx', isNonNegativeInt, Number],
      ['number', isPositiveInt, Number],
    ],
    ({ res }, beginIdx, number) => res | sendStatus (200, {
      metadata: { totalAvailable: data.length, },
      results: data.slice (beginIdx, beginIdx + number),
    }),
  ))
  | secureGet (privsUser) ('/fonds', getAndValidateQuery ([
      ['uuid', ok],
    ],
    ({ res }, uuid) => res | sendStatus (
      ... dataByUuid | ifMapHas (uuid) (
        (fonds) => [200, { results: fonds, }],
        () => [499, { umsg: 'No such uuid ' + uuid, }],
      ),
    ),
  ))
  | securePatch (privsUser) ('/user', (req, res) => {
    const { email, oldPassword, newPassword } = req.body.data
    const knownHashed = getUserPassword (email)
    if (!checkPassword (oldPassword, knownHashed)) {
      return res | sendStatus (499, {
        umsg: 'Invalid attempt: Wrong Password',
      })
    }
    if (!updateUserPassword (email, hashPassword (newPassword))) {
      return res | sendStatusEmpty (500)
    }
    return res | sendStatus (200, null)
  })
  | listen (port) (() => {
    String (port) | green | sprintf1 ('listening on port %s') | info
  })

init ({ port: serverPort, })
