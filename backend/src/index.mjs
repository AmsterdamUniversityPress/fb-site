import {
  pipe, compose, composeRight,
  sprintf1, sprintfN, tryCatch, lets, id, nil, tap,
  gt, againstAny, eq, die, map, reduce, split,
  not, concatTo, recurry, ifOk, ifNil, noop,
  repeatF, dot, dot1, dot2, join, appendM,
  anyAgainst, ifPredicate, whenOk,
} from 'stick-js/es'

import crypto from 'node:crypto'

import bcrypt from 'bcrypt'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import yargsMod from 'yargs'

import nodemailer from 'nodemailer'

import { allP, recover, rejectP, startP, then, } from 'alleycat-js/es/async'
import { fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { listen, post, use, sendStatus, sendStatusEmpty, } from 'alleycat-js/es/express'
import { green, error, info, } from 'alleycat-js/es/io'
import { decorateRejection, length, logWith, } from 'alleycat-js/es/general'
import { ifArray, any, isEmptyString, ifEquals, } from 'alleycat-js/es/predicate'

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
  privilegesGet as dbPrivilegesGet,
  usersGet as dbUsersGet,
} from './db.mjs'
import { errorX, warn, } from './io.mjs'
import {
  env, envOrConfig, ifMapHas,
  isNonNegativeInt, isPositiveInt, isSubsetOf,
  lookupOnOr, lookupOnOrDie, mapTuplesAsMap, decorateAndRethrow,
  retryPDefaultMessage,
} from './util.mjs'
import {
  getAndValidateQuery,
  getAndValidateBodyParams,
  getAndValidateRequestParams,
  basicAlphaNumericStringValidator,
  basicBase64StringValidator,
  basicEmailValidator,
  basicPasswordValidator,
  basicStringValidator,
  basicUUIDValidator,
  basicValidator,
  basicStringListValidator,
} from './util-express.mjs'
import {
  init as redisInit,
  del as redisDelete,
  getFail as redisGetFail,
  key as redisKey,
  setExpire as redisSetExpire,
} from './util-redis.mjs'

import {
  authFactory,
// } from 'alleycat-express-jwt'
} from './alleycat-express-jwt/index.mjs'

const configTop = config | configure.init

const appEnv = lets (
  () => [
    'must be dev|tst|acc|prd',
    againstAny ([eq ('dev'), eq ('tst'), eq ('acc'), eq ('prd')]),
  ],
  (validate) => env ('APP_ENV', validate),
)

const getRedisURLConfigKey = 'getRedisURL.' + appEnv
const { activateTokenExpireSecs, activateTokenLength, authorizeByIP, cookieMaxAgeMs, email: emailOpts, fbDomains, [getRedisURLConfigKey]: getRedisURL, minimumPasswordScore, serverPort, users, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets (
    'activateTokenExpireSecs',
    'activateTokenLength',
    'authorizeByIP',
    'cookieMaxAgeMs',
    'email',
    'fbDomains',
    getRedisURLConfigKey,
    'minimumPasswordScore',
    'serverPort',
    'users',
  ),
)

// --- `envOrConfig` here, because this is where we create cookieSecret and
// jwtSecret, and config is useful for development.

const cookieSecret = lets (
  () => ['must be longer than 25 characters', length >> gt (25)],
  (validate) => envOrConfig (configTop, 'cookieSecret', 'COOKIE_SECRET', validate),
)

const jwtSecret = lets (
  () => ['must be longer than 25 characters', length >> gt (25)],
  (validate) => envOrConfig (configTop, 'jwtSecret', 'JWT_SECRET', validate),
)

// --- `env` and not `envOrConfig`, because this is a system password which
// is set elsewhere, and config would unnecessarily expose it.

const redisPassword = lets (
  () => ['must be longer than 25 characters', length >> gt (25)],
  (validate) => env ('REDIS_PASSWORD', validate),
)

// @todo validation
const elasticURL = lets (
  () => ['must be a url (?)', () => true],
  (validate) => env ('ELASTIC_URL', validate),
)

const redisURL = getRedisURL (redisPassword)

const data = appEnv | lookupOnOrDie (
  'ierror appEnv',
  { dev: dataTst, tst: dataTst, acc: dataAcc, prd: dataPrd, }
)

const dataByUuid = data | mapTuplesAsMap ((_, v) => [v.uuid, v])

const emailTransporter = nodemailer.createTransport ({
  connectionTimeout: 3000,
  dnsTimeout: 3000,
  ... emailOpts,
})

const encrypt = (pw, saltRounds=10) => bcrypt.hashSync (pw, saltRounds)

// --- (String, Buffer) => Boolean
const checkPassword = (testPlain, knownHashed) => bcrypt.compareSync (testPlain, knownHashed)
const passwordMatchesPlaintext = recurry (2) (
  (testPlain) => (knownHashed) => checkPassword (testPlain, knownHashed),
)
const ifPasswordMatchesPlaintext = passwordMatchesPlaintext >> ifPredicate

const authIP = authIPFactory.create ().init (authorizeByIP)

// --- @throws
const doDbCall = (dbFunc, vals) => dbFunc (...vals) | fold (
  die << decorateRejection ('DB error on ' + dbFunc.name + ': '),
  id,
)

// --- these all throw
const getLoggedIn = (email) => doDbCall (dbLoggedInGet, [ email, ])
const addLoggedIn = (email) => doDbCall (dbLoggedInAdd, [ email, ])
const removeLoggedIn = (email) => doDbCall (dbLoggedInRemove, [ email, ])
const updateUserPasswordSync = (email, pw) => doDbCall (
  dbUserPasswordUpdate, [email, encrypt (pw)],
)

const updateUserPassword = async (email, pw) => updateUserPasswordSync (email, pw)

// --- must return { password, reqData, userinfo, }, or `null`.
const getUserinfoLoginSync = (email) => {
  const info = doDbCall (dbUserGet, [email])
  if (nil (info)) return
  const privileges = doDbCall (dbPrivilegesGet, [email])
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

// --- returns an optional object which will get stored in the jwt as
//     { session: retValue, }
// or `null`.

const initSession = async (_email) => {
  const sessionId = crypto.randomUUID ()
  // --- @todo store in db
  return { sessionId, }
}

// --- @todo can we remove the call to getUserinfoLoginSync here? Seems the
// only part we need is `doDbCall (dbUserGet ...)`
const getUserPassword = (email) => getUserinfoLoginSync (email)
  | whenOk (({ password, ... _ }) => password)

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
  () => new Set (doDbCall (dbPrivilegesGet, [email])),
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
  cookieMaxAgeMs,
  getUserinfoLogin,
  getUserinfoRequest,
  initSession,
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

const fbDomain = fbDomains [appEnv] ?? die ('Missing fbDomain for ' + appEnv)

const reduceEmail = (contents) => lets (
  () => (x) => '<p>' + x + '</p>',
  (toP) => contents | reduce (
    ([text, html], x) => x | ifArray (
      ([t, h]) => [text | appendM (t), html | appendM (toP (h))],
      () => [text | appendM (x), html | appendM (toP (x))],
    ),
    [[], []],
  ),
  (_, [text, html]) => [
    text | join ('\n\n'),
    html | join ('\n'),
  ],
)

const getWelcomeOrResetLink = (stub, email, token) => join ('/', [
  'https://' + fbDomain, stub, email, encodeURIComponent (token),
])

const getWelcomeEmail = (email, token) => {
  const link = getWelcomeOrResetLink ('init-password', email, token)
  const contents = [
    'Welkom bij FB online ...',
    [
      'Ga naar deze URL om een wachtwoord te kiezen en je account te activeren:',
      'Klik hier om een wachtwoord te kiezen en je account te activeren:',
    ],
    [
      link,
      [link] | sprintfN (`<a href='%s'>Account activeren</a>`),
    ],
  ]
  return [
    'Welkom bij FB Online!',
    ... reduceEmail (contents),
  ]
}

const getResetEmail = (email, token) => {
  const link = getWelcomeOrResetLink ('reset-password', email, token)
  const contents = [
    'Wachtwoord reset ...',
    'Je krijgt deze e-mail omdat je op “wachtwoord vergeten” hebt geklikt. Als jij dit niet hebt gedaan kun je dit bericht negeren',
    [
      'Ga naar deze URL om een nieuw wachtwoord te kiezen:',
      'Klik hier om een wachtwoord te kiezen:',
    ],
    [
      link,
      [link] | sprintfN (`<a href='%s'>Nieuw wachtwoord kiezen</a>`),
    ],
  ]
  return [
    'Wachtwoord reset',
    ... reduceEmail (contents)
  ]
}

const sendWelcomeOrResetEmail = (email, type) => {
  const token = crypto.randomBytes (activateTokenLength).base64Slice ()
    // --- slash (%2F) can occur in base64 but causes Apache to give a 404,
    // so for now we manually replace slash with a different character
    // (@todo check AllowEncodedSlashes directive)
    .replace (/\//g, 'A')
  const tokenEncrypted = encrypt (token)
  const [subject, text, html] = type | lookupOnOrDie (
    'sendWelcomeOrResetEmail(): Invalid type: ' + type,
    {
      welcome: getWelcomeEmail (email, token),
      reset: getResetEmail (email, token),
    },
  )

  return startP ()
  | then (() => redisSetExpire (activateTokenExpireSecs) (
    redisKey ('activate', email), tokenEncrypted),
  )
  | then (() => emailTransporter.sendMail ({
    subject,
    text,
    html,
    to: email,
    from: emailOpts.fromString,
  }))
  | recover (rejectP << decorateRejection ('Unable to send welcome email: '))
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
  | secureGet (privsUser) ('/search/autocomplete/:query', getAndValidateRequestParams ([
      basicStringValidator ('query'),
    ], ({ res }, query) => res | sendStatus (200, { results: [1, 2, 3], }),
  ))
  | securePatch (privsUser) ('/user', getAndValidateBodyParams ([
      basicEmailValidator ('email'),
      basicStringValidator ('oldPassword'),
      basicPasswordValidator (minimumPasswordScore) ('newPassword'),
    ], ({ res }, email, oldPassword, newPassword) => {
      const knownHashed = getUserPassword (email)
      if (nil (knownHashed)) return res | sendStatus (499, {
        umsg: 'Ongeldige gebruiker',
      })
      if (!checkPassword (oldPassword, knownHashed)) {
        return res | sendStatus (499, {
          umsg: 'Onjuist wachtwoord (huidig)',
        })
      }
      decorateAndRethrow (
        () => '/user: update password failed: ',
        () => updateUserPasswordSync (email, newPassword),
      )
      return res | sendStatus (200, null)
    },
  ))
  | secureDelete (privsAdminUser) ('/user-admin/:email', getAndValidateRequestParams ([
      basicEmailValidator ('email'),
    ], ({ res, }, email) => {
      doDbCall (dbUserRemove, [email])
      return res | sendStatus (200, null)
    }),
  )
  | securePut (privsAdminUser) ('/user-admin/', getAndValidateBodyParams ([
      basicEmailValidator ('email'),
      basicAlphaNumericStringValidator ('firstName'),
      basicAlphaNumericStringValidator ('lastName'),
      basicStringListValidator ('privileges')
    ], ({ res, }, email, firstName, lastName, privileges) => {
      doDbCall (dbUserAdd, [email, firstName, lastName, privileges, ],  null)
      return retryPDefaultMessage (
        'Unable to send email',
        warn,
        lookupOnOr (() => null, {
          0: 100,
          1: 500,
          2: 1000,
        }),
        () => sendWelcomeOrResetEmail (email, 'welcome'),
      )
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
  | post ('/user/reset-password', getAndValidateBodyParams ([
    basicEmailValidator ('email'),
    basicPasswordValidator (minimumPasswordScore) ('password'),
    basicBase64StringValidator ('token'),
  ],
    ({ res }, email, password, token) => {
      const userError = (imsg) => res | sendStatus (499, {
        imsg,
        umsg: 'Deze activatielink is verlopen of ongeldig',
      })
      // --- usually we can just throw an exception using die, and express
      // will send a response of 500, but during a promise chain that causes
      // a crash.
      const serverError = (msg) => {
        warn (msg)
        res | sendStatus (599, { imsg: 'Error with /user/reset-password', })
      }
      redisGetFail (redisKey ('activate', email))
      | then (ifPasswordMatchesPlaintext (token) (
        () => {
          allP ([
            updateUserPassword (email, password),
            redisDelete (redisKey ('activate', email))
          ])
          | then (() => res | sendStatus (200, null))
          | recover (serverError << decorateRejection ('updateUserPassword () or redisDeleteFail () failed: '))
        },
        () => userError ('No match for token'),
      ))
      | recover (serverError << decorateRejection ('Error retrieving/deleting token from redis: '))
    }
  ))
  | securePost (privsAdminUser) ('/user/send-welcome-email', getAndValidateBodyParams ([
      basicEmailValidator ('email'),
    ],
    ({ res }, to) => {
      // --- @todo retry
      return sendWelcomeOrResetEmail (to, 'welcome')
      | then ((_mailInfo) => res | sendStatus (200, null))
      | recover ((e) => {
        warn (decorateRejection ('Error with /user/send-welcome-email: ', e))
        res | sendStatusEmpty (500)
      })
    },
  ))
  | post ('/user/send-reset-email', getAndValidateBodyParams ([
      basicEmailValidator ('email'),
    ],
    ({ res }, to) => {
      // --- @todo retry
      return sendWelcomeOrResetEmail (to, 'reset')
      | then ((_mailInfo) => res | sendStatus (200, null))
      | recover ((e) => {
        warn (decorateRejection ('Error with /user/reset-welcome-email: ', e))
        res | sendStatusEmpty (500)
      })
    },
  ))
  | secureGet (privsAdminUser) ('/users', (_req, res) => {
    // @todo kattenluik has a nice doCallResults function for this...
    const users = doDbCall (dbUsersGet, [])
    return res | sendStatus (200, { users, })
  })
  | listen (port) (() => {
    String (port) | green | sprintf1 ('listening on port %s') | info
  })


const yargs = yargsMod
  .usage ('Usage: node $0 [options]')
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

const initRedis = async () => redisInit (redisURL, 1000)
| recover (error << decorateRejection ('Fatal error connecting to redis, not trying reconnect strategy: '))


dbInit (opt.forceInitDb)
// --- @future separate script to manage users
// --- set config key `users` to `null` or an empty list to not add default
// users on startup
dbInitUsers (encrypt, users ?? [])
init ({ port: serverPort, })
await initRedis ()
