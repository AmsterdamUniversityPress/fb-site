import {
  pipe, compose, composeRight,
  sprintf1, tryCatch, lets, id, nil, tap, ok,
  gt, againstAny, eq, die,
  not, concatTo, recurry, ifOk, ifNil,
} from 'stick-js/es'

import bcrypt from 'bcrypt'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'

import nodemailer from 'nodemailer'

import { recover, then, } from 'alleycat-js/es/async'
import { listen, use, sendStatus, sendStatusEmpty, } from 'alleycat-js/es/express'
import { green, } from 'alleycat-js/es/io';
import { decorateRejection, info, length, logWith, } from 'alleycat-js/es/general'
import { fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'

import { authIP as authIPFactory, } from './auth-ip.mjs'
import { config, } from './config.mjs'
import { dataTst, dataAcc, dataPrd, } from './data.mjs'
import { init as initDb,
  userAdd as dbUserAdd,
  userRemove as dbUserRemove,
  userGet as dbUserGet,
  userPasswordUpdate as dbUserPasswordUpdate,
  loggedInAdd as dbLoggedInAdd,
  loggedInRemove as dbLoggedInRemove,
  loggedInGet as dbLoggedInGet,
  // privilegeAdd as dbPrivilegeAdd,
  // privilegeGet as dbPrivilegeGet,
  privilegesGet as dbPrivilegesGet,
  usersGet as dbUsersGet,
} from './db.mjs';
import { errorX, warn, } from './io.mjs'
import {
  env, envOrConfig, ifMapHas,
  isNonNegativeInt, isPositiveInt, isSubsetOf,
  lookupOnOrDie, mapTuplesAsMap, decorateAndRethrow,
} from './util.mjs'
import { getAndValidateQuery, getAndValidateBodyParams, } from './util-express.mjs'

import {
  authFactory,
// } from 'alleycat-express-jwt'
} from './alleycat-express-jwt/index.mjs'

const configTop = config | configure.init

const { authorizeByIP, email: emailOpts, serverPort, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets (
    'authorizeByIP',
    'email',
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

const emailTransporter = nodemailer.createTransport ({
  connectionTimeout: 3000,
  dnsTimeout: 3000,
  ... emailOpts,
})

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

// const getPrivilege = (email) => doDbCallDie (dbPrivilegeGet, [ email, ])
// --- @throws
const getLoggedIn = (email) => doDbCallDie (dbLoggedInGet, [ email, ])
// --- @throws
const addLoggedIn = (email) => doDbCallDie (dbLoggedInAdd, [ email, ])
// --- @throws
const removeLoggedIn = (email) => doDbCallDie (dbLoggedInRemove, [ email, ])
const updateUserPassword = (email, pw) => doDbCallWarnNull (dbUserPasswordUpdate, [email, pw])

// --- must return { password, userinfo, }, where userinfo is an arbitrary
// structure which will be made available to the frontend, or `null`
const getUserinfoLoginSync = (email) => {
  const info = doDbCallDie (dbUserGet, [email])
  const privileges = doDbCallDie (dbPrivilegesGet, [email])
  const { firstName, lastName, password, } = info
  return {
    password,
    userinfo: {
      type: 'user',
      privileges,
      email,
      firstName,
      lastName,
    },
  }
}

const getUserinfoLogin = async (email) => getUserinfoLoginSync (email)

const getUserPassword = (email) => getUserinfoLoginSync (email)
  | (({ password, ... _ }) => password)

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
const secureDelete = (privs) => alleycatAuth.secureMethod ({ authorizeData: privs, }) ('delete')
const secureGet = (privs) => alleycatAuth.secureMethod ({ authorizeData: privs, }) ('get')
const securePatch = (privs) => alleycatAuth.secureMethod ({ authorizeData: privs, }) ('patch')
const securePost = (privs) => alleycatAuth.secureMethod ({ authorizeData: privs, }) ('post')
const securePut = (privs) => alleycatAuth.secureMethod ({ authorizeData: privs, }) ('put')

const privsUser = new Set (['user'])
const privsAdminUser = new Set (['admin-user'])

const corsOptions = {
  // --- reflect the request origin.
  origin: true,
  // --- allow credentials mode 'include' in the request.
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

const init = ({ port, }) => express ()
  | use (bodyParser.json ())
  | use (cookieParser (cookieSecret))
  | use (cors (corsOptions))
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
  | secureDelete (privsAdminUser) ('/user-admin/:email', (req, res) => {
    const email = req.params.email
    // const email = 'arie@alleycat.cc'
    console.log ('email', email)
    doDbCallDie (dbUserRemove, [email])
    return res | sendStatus (200, null)
  })
  | securePut (privsAdminUser) ('/user-admin/', (req, res) => {
    // @todo where to get the (new) password from?
    const password = "boom"
    const { email, firstName, lastName, privileges, } = req.body.data
    doDbCallDie (dbUserAdd, [email, firstName, lastName, privileges, password])
    return res | sendStatus (200, null)
  })
  | securePost (privsAdminUser) ('/user/send-welcome-email', getAndValidateBodyParams ([
      ['email', ok],
    ],
    ({ res }, to) => {
      emailTransporter.sendMail ({
        to,
        from: emailOpts.fromString,
        subject: 'Hallo van FB',
        text: 'welkom',
        html: '<b>welkom</b>',
      })
      | then ((_mailInfo) => res | sendStatus (200, null))
      | recover ((e) => {
        warn (decorateRejection ('Unable to send email: ', e))
        res | sendStatusEmpty (500)
      })
    },
  ))
  | secureGet (privsAdminUser) ('/users', (_req, res) => {
    // @todo kattenluik has a nice doCallResults function for this...
    const users = doDbCallDie (dbUsersGet, [])
    return res | sendStatus (200, { users, })
  })
  | listen (port) (() => {
    String (port) | green | sprintf1 ('listening on port %s') | info
  })

init ({ port: serverPort, })
