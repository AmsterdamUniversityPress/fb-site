import {
  pipe, compose, composeRight,
  sprintf1, tryCatch, lets, id, nil, tap, ok,
  gt, againstAny, eq, die,
  not, concatTo, recurry, ifOk, ifNil,
  repeatF, prop, dot1, join,
} from 'stick-js/es'

import bcrypt from 'bcrypt'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import yargsMod from 'yargs'

import nodemailer from 'nodemailer'

import { recover, rejectP, then, } from 'alleycat-js/es/async'
import { listen, use, sendStatus, sendStatusEmpty, } from 'alleycat-js/es/express'
import { error, green, } from 'alleycat-js/es/io'
import { decorateRejection, info, length, logWith, } from 'alleycat-js/es/general'
import { fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'

import { authIP as authIPFactory, } from './auth-ip.mjs'
import { config, } from './config.mjs'
import { dataTst, dataAcc, dataPrd, } from './data.mjs'
import {
  init as dbInit,
  initUsers as dbInitUsers,
  userAdd as dbUserAdd,
  userRemove as dbUserRemove,
  userGet as dbUserGet,
  userPasswordUpdate as dbUserPasswordUpdate,
  loggedInAdd as dbLoggedInAdd,
  loggedInRemove as dbLoggedInRemove,
  loggedInGet as dbLoggedInGet,
  // privilegeAdd as dbPrivilegeAdd,
  privilegesGet as dbPrivilegesGet,
  usersGet as dbUsersGet,
} from './db.mjs';
import { errorX, warn, } from './io.mjs'
import {
  env, envOrConfig, ifMapHas,
  isNonNegativeInt, isPositiveInt, isSubsetOf,
  lookupOnOrDie, mapTuplesAsMap, decorateAndRethrow,
} from './util.mjs'
import {
  getAndValidateQuery,
  getAndValidateBodyParams,
  getAndValidateRequestParams,
  basicEmailValidator,
  basicStringValidator,
  basicUUIDValidator,
  basicValidator,
  basicStringListValidator,
} from './util-express.mjs'

import {
  authFactory,
// } from 'alleycat-express-jwt'
} from './alleycat-express-jwt/index.mjs'

const configTop = config | configure.init

const { authorizeByIP, email: emailOpts, serverPort, users, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets (
    'authorizeByIP',
    'email',
    'serverPort',
    'users',
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

// --- (Int, String) => String
const generatePassword = (length, chars) => {
  const generateChar = () => lets (
    () => Math.floor (Math.random () * chars.length),
    (n) => chars | dot1 ('charAt') (n)
  )
  return repeatF (generateChar, length) | join ('')
}

const alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const integers = "0123456789"
const exCharacters = "!@#$%^&*_-=+"
const chars = alpha + integers + exCharacters


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
// --- (String, Buffer) => Boolean
const checkPassword = (testPlain, knownHashed) => bcrypt.compareSync (testPlain, knownHashed)

const authIP = authIPFactory.create ().init (authorizeByIP)

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

// --- must return { password, reqData, userinfo, }, or `null`.
const getUserinfoLoginSync = (email) => {
  const info = doDbCallDie (dbUserGet, [email])
  if (nil (info)) return
  const privileges = doDbCallDie (dbPrivilegesGet, [email])
  if (nil (privileges)) return
  const { firstName, lastName, password, } = info
  return {
    password,
    // --- `reqData` is an arbitrary object which will be merged in to `req`
    // and made available to middleware and routing functions.
    // --- for example, to mimic the default passport behavior of setting
    // `req.user`, set this to `{ user: someValue, }`
    // --- use `null` or empty object to not set anything.
    reqData: null,
    // --- `userinfo` is an arbitrary object which will be sent in the
    // response body of the /hello and /login routes.
    // --- also, on each request we merge an object
    //     { user: { username, userinfo, }}
    // into `req`, in the same way as with `reqData`.
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

// --- @throws
const getPrivilegesForUser = (email) => email | ifNil (
  // --- null user means IP-based authentication.
  () => new Set (['user']),
  () => new Set (doDbCallDie (dbPrivilegesGet, [email])),
)

// --- @throws
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

const sendWelcomeEmail = (to) => {
  return emailTransporter.sendMail ({
    to,
    from: emailOpts.fromString,
    subject: 'Hallo van FB',
    text: 'welkom',
    html: '<b>welkom</b>',
  })
  | recover ((e) => {
    rejectP << decorateRejection ('Unable to send welcome email: ', e)
  })
}

const init = ({ port, }) => express ()
  | use (bodyParser.json ())
  | use (cookieParser (cookieSecret))
  | use (cors (corsOptions))
  | useAuthMiddleware
  | secureGet (privsUser) ('/fondsen', getAndValidateQuery ([
      basicValidator ('beginIdx', isNonNegativeInt, Number),
      basicValidator ('number', isPositiveInt, Number),
    ],
    ({ res, }, beginIdx, number) => res | sendStatus (200, {
      metadata: { totalAvailable: data.length, },
      results: data.slice (beginIdx, beginIdx + number),
    }),
  ))
  | secureGet (privsUser) ('/fonds', getAndValidateQuery ([
      basicUUIDValidator ('uuid'),
    ], ({ res }, uuid) => res | sendStatus (
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
  | secureDelete (privsAdminUser) ('/user-admin/:email', getAndValidateRequestParams ([
      basicEmailValidator ('email'),
    ], ({ res, }, email) => {
      doDbCallDie (dbUserRemove, [email])
      return res | sendStatus (200, null)
    }),
  )
  | securePut (privsAdminUser) ('/user-admin/', getAndValidateBodyParams ([
      basicEmailValidator ('email'),
      basicStringValidator ('firstName'),
      basicStringValidator ('lastName'),
      basicStringListValidator ('privileges')
    ], ({ res, }, email, firstName, lastName, privileges) => {
      doDbCallDie (dbUserAdd, [email, firstName, lastName, privileges, ],  null)
      return sendWelcomeEmail (email)
      | then ((_mailInfo) => res | sendStatus (200, null))
      | recover ((e) => {
        warn (decorateRejection ('Error with /user-admin: ', e))
        res | sendStatus (599, {
          // --- @todo this message is getting swallowed in the front end
          umsg: 'User added but welcome email could not be sent',
        })
      })
    },
  ))
  | securePost (privsAdminUser) ('/user/send-welcome-email', getAndValidateBodyParams ([
      basicEmailValidator ('email'),
    ],
    ({ res }, to) => {
      return sendWelcomeEmail (to)
      | then ((_mailInfo) => res | sendStatus (200, null))
      | recover ((e) => {
        warn (decorateRejection ('Error with /user/send-welcome-email: ', e))
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


const yargs = yargsMod
  .usage ('Usage: node $0 [options]')
  // .option ('d', {
    // boolean: true,
    // describe: 'Increase verbosity for debugging. Also print more stack traces.',
  // })
  .option ('force-init-db', {
    boolean: true,
    describe: 'Initialise the database: this will erase all data if it exists.',
  })
  .strict ()
  .help ('h')
  .alias ('h', 'help')
  .showHelpOnFail (false, 'Specify --help for available options')

const opt = yargs.argv
// --- showHelp also quits.
if (opt._.length !== 0)
  yargs.showHelp (error)

dbInit (opt.forceInitDb)
// --- @future separate script to manage users
// --- set config key `users` to `null` or an empty list to not add default
// users on startup
dbInitUsers (hashPassword, users ?? [])

init ({ port: serverPort, })
