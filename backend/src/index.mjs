import {
  pipe, compose, composeRight,
  sprintf1, sprintfN, tryCatch, lets, id, nil, tap,
  rangeTo, prop, remapTuples, xReplace,
  gt, againstAny, eq, die, map, reduce, split, values,
  not, concatTo, recurry, ifOk, ifNil, noop, take,
  repeatF, dot, dot1, dot2, join, appendM, path,
  anyAgainst, ifPredicate, whenOk, invoke, each,
} from 'stick-js/es'

import crypto from 'node:crypto'

import descend from 'ramda/es/descend'
import sortWith from 'ramda/es/sortWith'

import bcrypt from 'bcrypt'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import yargsMod from 'yargs'

import nodemailer from 'nodemailer'

import { allP, recover, rejectP, startP, then, resolveP, } from 'alleycat-js/es/async'
import { fold, flatMap, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { get, listen, post, use, sendStatus, sendStatusEmpty, } from 'alleycat-js/es/express'
import { green, error, info, } from 'alleycat-js/es/io'
import { decorateRejection, length, logWith, setTimeoutOn, composeManyRight, } from 'alleycat-js/es/general'
import { ifArray, any, isEmptyString, ifEquals, } from 'alleycat-js/es/predicate'


import { authIP as authIPFactory, } from './auth-ip.mjs'
import { config as configFb, } from './config-fb.mjs'
import { config as configUser, } from './config.mjs'
import { dataTst, dataAcc, dataPrd, } from './data.mjs'
import {
  staleSessionsClear as dbStaleSessionsClear,
  init as dbInit,
  initUsers as dbInitUsers,
  privilegesGet as dbPrivilegesGet,
  sessionAdd as dbSessionAdd,
  sessionGet as dbSessionGet,
  sessionRefresh as dbSessionRefresh,
  sessionRemove as dbSessionRemove,
  userAdd as dbUserAdd,
  userGet as dbUserGet,
  userPasswordUpdate as dbUserPasswordUpdate,
  userRemove as dbUserRemove,
  usersGet as dbUsersGet,
} from './db.mjs'
import { errorX, warn, } from './io.mjs'
import {
  env, envOptional, envOrConfig, ifMapHas,
  isNonNegativeInt, isPositiveInt, isSubsetOf,
  lookupOnOr, lookupOnOrDie, mapTuplesAsMap, decorateAndRethrow,
  retryPDefaultMessage,
  toListCollapseNil,
  flatten,
  thenWhenTrue,
  foldWhenLeft,
  effects,
  takeUnique,
} from './util.mjs'
import {
  getAndValidateQuery,
  getAndValidateBodyParams,
  getAndValidateRequestParams,
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
  init as esInit,
  // --- @todo should we check periodically / check for broken connection?
  // checkConnection as esCheckConnection,
  search as esSearch,
  searchPhrasePrefixNoContext as esSearchPhrasePrefixNoContext,
} from './elastic.mjs'

import {
  authFactory,
// } from 'alleycat-express-jwt'
} from './alleycat-express-jwt/index.mjs'

const configUserTop = configUser | configure.init
const configFbTop = configFb () | configure.init

const appEnv = lets (
  () => [
    'must be dev|tst|acc|prd',
    againstAny ([eq ('dev'), eq ('tst'), eq ('acc'), eq ('prd')]),
  ],
  (validate) => env ('APP_ENV', validate),
)

const getRedisURLConfigKey = 'getRedisURL.' + appEnv

const { authorizeByIP, email: emailOpts, fbDomains, [getRedisURLConfigKey]: getRedisURL, serverPort, users, } = tryCatch (
  id,
  decorateRejection ("Couldn't load user config: ") >> errorX,
  () => configUserTop.gets (
    'authorizeByIP',
    'email',
    'fbDomains',
    getRedisURLConfigKey,
    'serverPort',
    'users',
  ),
)

const { activateTokenExpireSecs, activateTokenLength, cookieMaxAgeMs, getStaleSessionSecs, minimumPasswordScore, schemaVersion, staleSessionCheckTimeoutMs, } = tryCatch (
  id,
  decorateRejection ("Couldn't load FB config: ") >> errorX,
  () => configFbTop.gets (
    'activateTokenExpireSecs',
    'activateTokenLength',
    'cookieMaxAgeMs',
    'getStaleSessionSecs',
    'minimumPasswordScore',
    'schemaVersion',
    'staleSessionCheckTimeoutMs',
  ),
)

const staleSessionSecs = getStaleSessionSecs ()

// --- `envOrConfig` here, because this is where we create cookieSecret and
// jwtSecret, and config is useful for development.

const cookieSecret = lets (
  () => ['must be longer than 25 characters', length >> gt (25)],
  (validate) => envOrConfig (configUserTop, 'cookieSecret', 'COOKIE_SECRET', validate),
)

const jwtSecret = lets (
  () => ['must be longer than 25 characters', length >> gt (25)],
  (validate) => envOrConfig (configUserTop, 'jwtSecret', 'JWT_SECRET', validate),
)

// --- `env` and not `envOrConfig`, because this is a system password which
// is set elsewhere, and config would unnecessarily expose it.

const redisPassword = lets (
  () => ['must be longer than 25 characters', length >> gt (25)],
  (validate) => env ('REDIS_PASSWORD', validate),
)

const elasticURL = env ('ELASTIC_URL')
const allowDestructiveMigrations = (envOptional ('ALLOW_DESTRUCTIVE_MIGRATIONS') ?? '0')
  | lookupOnOrDie ('Invalid value for ALLOW_DESTRUCTIVE_MIGRATIONS') ({
  0: false,
  1: true,
})

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

// --- these all @throw
const getLoggedIn = (email) => doDbCall (dbSessionGet, [email])
const addLoggedIn = (email, sessionId) => doDbCall (dbSessionAdd, [email, sessionId])
const refreshSession = (email, sessionId) => doDbCall (dbSessionRefresh, [email, sessionId])
const removeLoggedIn = (email, sessionId) => doDbCall (dbSessionRemove, [email, sessionId])
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
  isAuthorized: async (email, _req, privileges=null) => {
    // --- `privileges` may be null, but we want to make sure it's always explicitly set to
    // something (we use the empty set to mean no / open authorization)
    if (nil (privileges)) die ('isAuthorized (): privileges is nil')
    if (not (checkPrivileges (email, privileges)))
      return [false, 'missing privileges for this route']
    return [true]
  },
  isLoggedIn: async (email, _, _req) => {
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
  onHello: async (email, { session: { sessionId, }}) => {
    decorateAndRethrow (
      [email, sessionId] | sprintfN (
        'Unable to look up session for email=%s session id=%s: ',
      ),
      () => refreshSession (email, sessionId),
    )
  },
  // --- arg 2 = { username, userinfo, session=null, }
  onLogin: async (email, { session: { sessionId, }}) => {
    addLoggedIn (email, sessionId)
  },
  onLogout: async (email, { session: { sessionId, }}) => {
    decorateAndRethrow (
      [email, sessionId] | sprintfN (
        'Unable to look up session for email=%s session id=%s: ',
      ),
      () => removeLoggedIn (email, sessionId),
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

const search = (max, query) => esSearch (max, query)
  | then ((results) => {
    const ret = []
    let idx = -1
    results | each ((result) => {
      const { _source: fonds, highlight, } = result
      const { uuid, naam_organisatie: name, type_organisatie: type, categories, } = fonds
      const match = highlight | values | flatten (1)
      match | each ((theMatch) => ret.push ({
        matchKey: ++idx,
        uuid,
        categories,
        name,
        type,
        match: theMatch,
      }))
    })
    return ret
  })

const completeQueriesSimple = invoke (() => {
  const fields = [
    'doelstelling',
    'doelgroep',
    'categories',
    'naam_organisatie',
    'type_organisatie',
  ]
  const minChars = 3
  const lookup = new Map
  // let x = 0
  for (const fonds of data) {
    for (const field of fields) {
      const value = String (fonds [field] ?? '')
      for (const word of (value.match (/\w+/g) ?? [])) {
        if (word.length < minChars) continue
        for (const n of (minChars | rangeTo (100))) {
          const fragment = word.slice (0, n)
          const l = lookup.get (fragment) ?? new Map
          const numOccurs = l.get (word) ?? 0
          l.set (word, numOccurs + 1)
          lookup.set (fragment, l)
        }
      }
    }
  }
  // --- sort on numOccurs
  const sorted = new Map
  const elementAt = prop
  for (const [fragment, l] of lookup.entries ()) {
    // --- [[word, numOccurs], [word, numOccurs], ...]
    const data = Array.from (l.entries ())
      | sortWith ([descend (elementAt (1))])
      | map (elementAt (0))
    sorted.set (fragment, data)
  }
  return async (max, query) => sorted.get (query) | ifOk (
    take (max),
    () => [],
  )
})

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

const getPasswordChangedEmail = (email, _) => {
  const contents = [
    'Je wachtwoord voor FB Online is zojuist veranderd.',
    'Je gebruikersnaam is: ' + email,
    'We tonen het nieuwe wachtwoord niet. Als je je wachtwoord niet zelf hebt veranderd via onze interface, neem dan gelijk contact op met ...',
  ]
  return [
    'Je wachtwoord voor FB Online is veranderd',
    ... reduceEmail (contents),
  ]
}

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

const mkActivateToken = () => lets (
  () => crypto.randomBytes (activateTokenLength).base64Slice (),
  // --- slash (%2F) can occur in base64 but causes Apache to give a 404, so
  // for now we manually replace slash with a different character (@todo
  // check AllowEncodedSlashes directive)
  (token) => token.replace (/\//g, 'A'),
  (_, token) => encrypt (token),
  (_, token, tokenEncrypted) => [token, tokenEncrypted],
)

const sendInfoEmailTryOnce = (email, type) => {
  const [getEmail, storeToken, [token, tokenEncrypted]] = type | lookupOnOrDie (
    'sendInfoEmailTryOnce (): Invalid type: ' + type,
    {
      'password-changed': [getPasswordChangedEmail, false, [null, null]],
      reset: [getResetEmail, true, mkActivateToken ()],
      welcome: [getWelcomeEmail, true, mkActivateToken ()],
    },
  )
  const [subject, text, html] = getEmail (email, token)

  return startP ()
  // --- on a retry, this will overwrite the previous one, so that's fine.
  | thenWhenTrue (storeToken) (() => redisSetExpire (activateTokenExpireSecs) (
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

const sendInfoEmail = (email, type) => retryPDefaultMessage (
  'Unable to send email',
  warn,
  // --- @todo string/int
  lookupOnOr (() => null, {
    0: 100,
    1: 500,
    2: 1000,
  }),
  () => sendInfoEmailTryOnce (email, type),
)

const cacheExpireSecs = 10 * 3600

const init = ({ port, }) => express ()
  | use (bodyParser.json ())
  | use (cookieParser (cookieSecret))
  | use (cors (corsOptions))
  | useAuthMiddleware
  | use ((_req, res, next) => {
    res.set ('Cache-control', cacheExpireSecs | sprintf1 ('max-age=%d'))
    next ()
  })
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
  | secureGet (privsUser) ('/search/search/:query', getAndValidateRequestParams ([
      basicStringValidator ('query'),
    ], ({ res }, query) => {
      search (3, query)
      | then ((results) => res | sendStatus (200, { results, }))
      | recover (
        decorateRejection ('Error with elastic search: ') >> effects ([
          warn,
          () => res | sendStatusEmpty (500),
        ]),
      )
    },
  ))

// @todo this works. Not a huge problem if this is a post, instead of a get, but it's still a
// weird bug.
  | securePost (privsUser) ('/search/autocomplete-query/', getAndValidateBodyParams ([
      basicStringValidator ('query'),
    ], ({ res }, query) => {
      // --- if the query doesn't contain any upper-case characters,
      // transform all hits to lowercase.
      const transformCase = lets (
        () => query.match (/\p{Uppercase}/u),
        (hasUpper) => hasUpper ? id : dot ('toLowerCase'),
      )
      // --- for some reason '(JJF)' comes out as '(JJF' in the
      // highlighting, even though tokenizing works properly ('JJF').
      // --- so we do an extra check here for parentheses at the beginning
      // or end.
      // --- @future get rid of this
      const filterPunctuation = composeManyRight (
        xReplace (/^[()]/, ''),
        xReplace (/[()]$/, ''),
      )
      esSearchPhrasePrefixNoContext (10, query)
      | then ((hits) => {
        const results = hits | flatMap (
          ({ highlight, }) => highlight | values | flatMap (
            (x) => x | map (filterPunctuation >> transformCase),
          ),
        ) | takeUnique (10)
        res | sendStatus (200, { results, })
      })
      | recover (
        decorateRejection ('Error with searchPhrasePrefixNoContext (): ') >> effects ([
          warn,
          () => res | sendStatusEmpty (500),
        ]),
      )
    },
  ))

/*
  original; breaks on sending query = 'w' (all other letters work)
  sends a 499 from alleycat-jwt, a problem with authentication.
  funny thing is, if we don't use the secureGet, but regular get, the
  Error remains the same (but it shouldn't be authenticating then, so why the error?)
  Could it be something related to cache?
*/

  // | secureGet (privsUser) ('/search/autocomplete-query/:query', getAndValidateRequestParams ([
      // basicStringValidator ('query'),
    // ], async ({ res }, query) => {
      // const results = await completeQueries (10, query)
      // return res | sendStatus (200, { results, })
    // },
  // ))

  // this also doesn't work
  // | get ('/search/autocomplete-query/:query', (res, req) => {
      // const query = req.query
      // const results = ['hello', 'hollow']
      // return res | sendStatus (200, { results, })
    // },
  // )

  // --- @todo should we also require a token here?
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
      return sendInfoEmail (email, 'password-changed')
      | then (() => res | sendStatus (200, null))
      | recover (
        (e) => {
          warn ('/user: update password succeeded, but unable to send an email to the user; considering this a success and returning 201, error was: ', e)
          return res | sendStatus (201, null)
        },
      )
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
      basicStringValidator ('firstName'),
      basicStringValidator ('lastName'),
      basicStringListValidator ('privileges')
    ], ({ res, }, email, firstName, lastName, privileges) => {
      doDbCall (dbUserAdd, [email, firstName, lastName, privileges, ],  null)
      return sendInfoEmail (email, 'welcome')
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
          | recover (serverError << decorateRejection ('updateUserPassword () or redisDeleteFail () failed: '))
          | then (() => sendInfoEmail (email, 'password-changed')
            | then (() => res | sendStatus (200, null))
            | recover ((e) => {
              warn ('/user/reset-password: update password succeeded, but unable to send an email to the user; considering this a success and returning 201, error was: ', e)
              res | sendStatus (201, null)
            })
          )
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
      return sendInfoEmail (to, 'welcome')
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
      return sendInfoEmail (to, 'reset')
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
  .option ('force-reindex-elastic', {
    boolean: true,
    describe: 'Rebuild the elastic index even if it already exists.',
  })
  .strict ()
  .help ('h')
  .alias ('h', 'help')
  .showHelpOnFail (false, 'Specify --help for available options')

const opt = yargs.argv
// --- showHelp also quits.
if (opt._.length !== 0)
  yargs.showHelp (error)

const clearStaleSessions = (ms) => {
  info ('clearing stale sessions')
  dbStaleSessionsClear (ms) | foldWhenLeft (
    warn << decorateRejection ('Unable to clear stale sessions: '),
  )
}

const initRedis = async () => redisInit (redisURL, 1000)
  | recover (error << decorateRejection ('Fatal error connecting to redis, not trying reconnect strategy: '))
const initElastic = async () => esInit (elasticURL, data, { forceReindex: opt.forceReindexElastic, })
  | recover (error << decorateRejection ('Fatal error connecting to elastic: '))

await initRedis ()
await initElastic ()

dbInit (schemaVersion, allowDestructiveMigrations)
staleSessionCheckTimeoutMs | setTimeoutOn (
  () => clearStaleSessions (staleSessionSecs * 1000),
)
// --- @future separate script to manage users
// --- set config key `users` to `null` or an empty list to not add default
// users on startup
if (schemaVersion !== 0) dbInitUsers (encrypt, users ?? [])

init ({ port: serverPort, })
