import {
  pipe, compose, composeRight,
  sprintf1, sprintfN, tryCatch, lets, id, nil,
  rangeTo, prop, xReplace, path, ok, defaultTo,
  gt, againstAny, eq, die, map, reduce, split, values,
  not, recurry, ifOk, ifNil, take, dot, join,
  ifPredicate, whenOk, invoke, each, appendM,
  tap, ifTrue, mapValues,
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

import { allP, recover, rejectP, startP, then, } from 'alleycat-js/es/async'
import { fold, flatMap, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { listen, post, use, sendStatus, sendStatusEmpty, } from 'alleycat-js/es/express'
import { green, error, info, } from 'alleycat-js/es/io'
import { decorateRejection, length, setIntervalOn, trim, composeManyRight, logWith, ierror, } from 'alleycat-js/es/general'
import { ifArray, } from 'alleycat-js/es/predicate'

import { authIP as authIPFactory, } from './auth-ip.mjs'
import { config as configFb, } from './config-fb.mjs'
import { config as configUser, } from './config.mjs'
import { dataTst, dataAcc, dataPrd, getFilters, } from './data.mjs'
import {
  init as dbInit,
  initUsers as dbInitUsers,
  privilegesGet as dbPrivilegesGet,
  getAllowAnalytical as dbGetAllowAnalytical,
  sessionAdd as dbSessionAdd,
  sessionGet as dbSessionGet,
  sessionRefresh as dbSessionRefresh,
  sessionRemove as dbSessionRemove,
  staleSessionsClear as dbStaleSessionsClear,
  userAdd as dbUserAdd,
  userGet as dbUserGet,
  userPasswordUpdate as dbUserPasswordUpdate,
  userRemove as dbUserRemove,
  userAllowAnalyticalUpdate as dbUserAllowAnalyticalUpdate,
  usersGet as dbUsersGet,
} from './db.mjs'
import { getPasswordChangedEmail, getResetEmail, getWelcomeEmail, } from './emails.mjs'
import { errorX, warn, } from './io.mjs'
import {
  env, envOptional, envOrConfig, ifMapHas,
  isNonNegativeInt, isPositiveInt, isSubsetOf,
  lookupOnOr, lookupOnOrDie, mapTuplesAsMap, decorateAndRethrow,
  retryPDefaultMessage, thenWhenTrue, foldWhenLeft, effects, takeMapUnique,
  mapFromPairs, slice1, stripNonAlphaNum, toListCollapseNil,
  ifFindIndex,
} from './util.mjs'

import {
  truncateBGrowRight,
  truncateBGrowRight2,
  truncateBGrowBoth,
} from './util-truncate.mjs'

import {
  gvQuery,
  gvBodyParams,
  gvRequestParams,
  gv2,
  basicBase64StringValidator,
  basicBooleanValidator,
  basicEmailValidator,
  basicListValidator,
  basicPasswordValidator,
  basicStringListValidator,
  basicStringValidator,
  basicTheIdValidator,
  // basicUUIDValidator,
  basicRequiredValidator,
} from './util-express.mjs'
import {
  init as redisInit,
  del as redisDelete,
  getFail as redisGetFail,
  key as redisKey,
  setExpire as redisSetExpire,
} from './util-redis.mjs'
import {
  highlightTags,
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

// --- @todo
// const cacheExpireSecs = 10 * 3600
const cacheExpireSecs = null

// --- @future remove
const doHighlightDoelstelling = true

const appEnv = lets (
  () => [
    'must be dev|tst|acc|prd',
    againstAny ([eq ('dev'), eq ('tst'), eq ('acc'), eq ('prd')]),
  ],
  (validate) => env ('APP_ENV', validate),
)

const envIsDevOrTst = appEnv === 'dev' || appEnv === 'tst'

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

const fbDomain = fbDomains [appEnv] ?? die ('Missing fbDomain for ' + appEnv)

const dataByTheId = data | mapTuplesAsMap ((_, v) => [v.id, v])
// const dataByUuid = data | mapTuplesAsMap ((_, v) => [v.uuid, v])
const filterValues = getFilters (data)

// --- tries to get userinfo, and then run `f` on it, and returns a response if that fails
const getRequestInfoResponse = recurry (3) (
  (f) => (req) => (res) => req.alleycat
  | whenOk (f)
  | defaultTo (() => {
    ierror ('/user: unable to get user/session info from req')
    res | sendStatus (500)
  }),
)

const getUserinfoKeyResponse = recurry (3) (
  (key) => getRequestInfoResponse (path (['user', 'userinfo', key])),
)

const getSessionIdResponse = getRequestInfoResponse (path (['session', 'sessionId']))

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
const getAllowAnalytical = (sessionId) => doDbCall (dbGetAllowAnalytical, [sessionId])
const getLoggedIn = (email) => doDbCall (dbSessionGet, [email])
const addLoggedIn = (email, sessionId) => doDbCall (dbSessionAdd, [email, sessionId])
const refreshSession = (email, sessionId) => doDbCall (dbSessionRefresh, [email, sessionId])
const removeLoggedIn = (email, sessionId) => doDbCall (dbSessionRemove, [email, sessionId])
const updateUserPasswordSync = (email, pw) => doDbCall (
  dbUserPasswordUpdate, [email, encrypt (pw)],
)
const updateAllowAnalytical = (sessionId, allow) => doDbCall (
  dbUserAllowAnalyticalUpdate, [sessionId, allow],
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
  onHello: async (email, { session=null, }) => {
    const sessionId = session?.sessionId
    if (ok (sessionId)) {
      decorateAndRethrow (
        [email, sessionId] | sprintfN (
          'Unable to refresh session for email=%s session id=%s: ',
        ),
        () => refreshSession (email, sessionId),
      )
      const allowAnalytical = getAllowAnalytical (sessionId)
      return { allowAnalytical, }
    }
    // --- meaning no consent possible (an institutional user can not consent on behalf of other
    // users)
    return { allowAnalytical: null, }
  },
  // --- arg 2 = { username, userinfo, session=null, }
  onLogin: async (email, { session=null, }) => {
    console.log ('onLogin: session', session)
    const sessionId = session?.sessionId
    if (ok (sessionId)) addLoggedIn (email, session?.sessionId)
    return { allowAnalytical: null, }
  },
  onLogout: async (email, { session=null, }) => {
    const sessionId = session?.sessionId
    if (ok (sessionId)) decorateAndRethrow (
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

// --- receives an array with 1 element in the case of string fields (since
// number_of_fragments is 0) and several elements in the case of an array
// field (currently only `categories`).
const transformHighlightsMain = (highlights, _query, _ful) => highlights | ifNil (
  () => null,
  (xs) => xs | map (split (highlightTags [0])),
)

const transformHighlightsDoelstelling = not (doHighlightDoelstelling)
  ? (... _) => null
  : (highlights, query, _doelstelling) => highlights | ifNil (
    () => null,
    (xs) => {
      const tag = highlightTags [0]
      const tagTokenLength = 2*tag.length + query.length
      if (tagTokenLength > totalLength - firstChunkLength) {
        warn ('failed assert: tagTokenLength > totalLength - firstChunkLength')
        return null
      }
      if (tagTokenLength > highlightChunkLength / 2) {
        warn ('failed assert: tagTokenLength > highlightChunkLength / 2')
        return null
      }
      const firstChunkLength = 200
      const totalLength = 400
      const highlightChunkLength = 300
      if (xs.length > 1) die ('transformHighlightsDoelstelling (): expected array of size 1')
      const [hit] = xs
      if (hit.length <= firstChunkLength) return [hit | truncateBGrowRight (totalLength)]
      const [firstChunk, growAmount] = hit | truncateBGrowRight2 (firstChunkLength)
      const firstChunkHasHighlight = firstChunk.indexOf (tag) !== -1
      if (firstChunkHasHighlight) return [hit | truncateBGrowRight (totalLength)]
      const rest = hit | slice1 (firstChunkLength + growAmount)
      const idx = rest.indexOf (tag)
      if (idx === -1) die ('transformHighlightsDoelstelling (): no highlight tag found: ' + hit)
      const chunkWithHighlight = lets (
        () => Math.max (0, idx - highlightChunkLength / 2),
        (leftIdx) => truncateBGrowBoth (rest, leftIdx, highlightChunkLength),
      )
      return [firstChunk + ' ' + chunkWithHighlight]
    }
  )

// --- output must match the shape of `transformHighlights`
const transformNonHighlighted = ifNil (
  () => [],
  (x) => [[x]],
)

const mkTransform = recurry (5) (
  (highlight) => (fonds) => (highlightF) => (query) => (fields) => fields | mapFromPairs ((k, v) => [
    k,
    highlight [v] | ifOk (
      (highlights) => highlightF (highlights, query, fonds [v]),
      () => transformNonHighlighted (fonds [v]),
    ),
  ]),
)

// --- max * 3 is just a guess, to try to have enough results after
// duplicates have been removed.
const search = (query, searchFilters, pageSize, pageNum, filters) => esSearch (query, searchFilters, pageSize, pageNum, doHighlightDoelstelling, filters)
  | then (({ hits, numHits, aggregations, }) => {
    // --- for all fields except doelstelling we use the value returned in
    // `highlight` as the entire text to show.
    const simpleFields = [
      ['categories', 'categories'],
      ['name', 'naam_organisatie'],
      ['targetGroup', 'doelgroep'],
      ['type', 'type_organisatie'],
      ['workingRegion', 'werk_regio'],
    ]
    const matches = []
    // --- @future might save some time by first having elastic do the
    // highlight, then doing it manually
    let idx = -1
    hits | each ((result) => {
      const { _source: fonds, highlight={}, } = result
      const tag = highlightTags [0]
      const alphaNumQuery = stripNonAlphaNum (query)
      // --- manually highlight categories
      highlight.categories = fonds.categories | whenOk (map (
        (x) => x.replace (
          new RegExp (alphaNumQuery, 'gi'),
          (y) => tag + y + tag,
        ),
      ))
      const { id: theId, idx: idxFromJson, uuid, } = fonds
      const transform = mkTransform (highlight, fonds)
      matches.push ({
        matchKey: ++idx,
        ... simpleFields | transform (transformHighlightsMain, query),
        ... [['objective', 'doelstelling']] | transform (transformHighlightsDoelstelling >> transformHighlightsMain, query),
        id: theId,
        idx: idxFromJson,
        uuid,
      })
    })
    const buckets = aggregations | mapValues ((v) => v | prop ('buckets'))
    return { matches, numHits, buckets }
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

const getWelcomeOrResetLink = (stub, email, token) => join ('/', [
  'https://' + fbDomain, stub, email, encodeURIComponent (token),
])


const mkActivateToken = () => lets (
  () => crypto.randomBytes (activateTokenLength).base64Slice (),
  // --- slash (%2F) can occur in base64 but causes Apache to give a 404, so
  // for now we manually replace slash with a different character (@todo
  // check AllowEncodedSlashes directive)
  (token) => token.replace (/\//g, 'A'),
  (_, token) => encrypt (token),
  (_, token, tokenEncrypted) => [token, tokenEncrypted],
)

const mkTokenAndLink = (stub, email) => {
  const [token, tokenEncrypted] = mkActivateToken ()
  const link = getWelcomeOrResetLink (stub, email, token)
  return [link, tokenEncrypted]
}

const sendInfoEmailTryOnce = (email, type) => {
  const [getEmail, storeToken, getTokenAndLink] = type | lookupOnOrDie (
    'sendInfoEmailTryOnce (): Invalid type: ' + type,
    {
      'password-changed': [getPasswordChangedEmail, false, () => [null, null]],
      reset: [getResetEmail, true, () => mkTokenAndLink ('reset-password', email)],
      welcome: [getWelcomeEmail, true, () => mkTokenAndLink ('init-password', email)],
    },
  )
  const [link, tokenEncrypted] = getTokenAndLink ()
  const [subject, text, html] = getEmail (fbDomain, email, link)

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
  'Unable to send email to ' + email,
  warn,
  // --- @todo string/int
  lookupOnOr (() => null, {
    0: 100,
    1: 500,
    2: 1000,
  }),
  () => sendInfoEmailTryOnce (email, type),
)

// --- bump the query to the top of the autocomplete suggestions if it occurs
const bumpQuery = recurry (2) (
  (query) => (results) => results | ifFindIndex (eq (query)) (
    (idx) => [
      results [idx],
      ... results.slice (0, idx),
      ... idx === results.length - 1 ? [] : results.slice (idx + 1),
    ],
    () => results,
  ),
)

const init = ({ port, }) => express ()
  | use (bodyParser.json ())
  | use (cookieParser (cookieSecret))
  | use (cors (corsOptions))
  | useAuthMiddleware
  | use ((_req, res, next) => {
    cacheExpireSecs | whenOk (
      (secs) => res.set ('Cache-control', secs | sprintf1 ('max-age=%d')),
    )
    next ()
  })
  | secureGet (privsUser) ('/filters', ({ res, }) => res
    | sendStatus (200, {
      // metadata: { totalAvailable: data.length, },
      results: filterValues,
    }),
  )
  | secureGet (privsUser) ('/fondsen', gvQuery ([
      basicRequiredValidator ([isNonNegativeInt, Number], 'beginIdx'),
      basicRequiredValidator ([isPositiveInt, Number], 'number'),
    ],
    ({ res, }, beginIdx, number) => res | sendStatus (200, {
      metadata: { totalAvailable: data.length, },
      results: data.slice (beginIdx, beginIdx + number),
    }),
  ))
  | secureGet (privsUser) ('/fonds', gvQuery ([
      basicTheIdValidator ('theId'),
    ],
    ({ res }, theId) => res | sendStatus (
      ... dataByTheId | ifMapHas (Number (theId)) (
        (fonds) => [200, { results: fonds, }],
        () => [499, { umsg: 'No such theId ' + theId, }],
      ),
    ),
  ))
  | secureGet (privsUser) ('/search/search/:query', gv2 (
    gvRequestParams ([
      basicStringValidator ('query'),
    ]),
    gvQuery ([
      basicRequiredValidator ([isPositiveInt, Number], 'pageSize'),
      basicRequiredValidator ([isNonNegativeInt, Number], 'pageNum'),
      basicListValidator (false, [], 'categories'),
      basicListValidator (false, [], 'trefwoorden'),
      basicListValidator (false, [], 'naam_organisatie'),
      basicListValidator (false, [], 'regios'),
    ]),
    ({ res }, query, pageSize, pageNum, categories, trefwoorden, naam_organisatie, regios, ) => {
      const searchFilters = {
        categories,
        trefwoorden,
        naam_organisatie,
        regios,
      }
      search (query, searchFilters, pageSize, pageNum, filterValues)
      | then (({ matches, numHits, buckets }) => res | sendStatus (
        200,
        { results: matches, metadata: { numHits, buckets }}
      ))
      | recover (
        decorateRejection ('Error with elastic search: ') >> effects ([
          warn,
          () => res | sendStatusEmpty (500),
        ]),
      )
    },
  ))
  | secureGet (privsUser) ('/search/autocomplete-query/:query', gvRequestParams ([
      basicStringValidator ('query'),
    ],
    ({ res }, query) => {
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
        const results = hits
        | flatMap (
          ({ highlight, }) => highlight | values | flatMap (
            (x) => x | map (filterPunctuation >> transformCase),
          ),
        )
        | bumpQuery (query)
        // --- split result into [result, react-key], and we can simply
        // use result as the React key since it's unique.
        | takeMapUnique ((result) => [result, result], 10)
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

  // --- @todo should we also require a token here?
  // --- @todo change from PATCH/user to something like POST/user-password
  | securePatch (privsUser) ('/user', gvBodyParams ([
      basicStringValidator ('oldPassword'),
      basicPasswordValidator (minimumPasswordScore) ('newPassword'),
    ],
    ({ req, res }, oldPassword, newPassword) => {
      const email = res | getUserinfoKeyResponse ('email', req)
      // --- response has already been sent
      if (nil (email)) return
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
        '/user: update password failed: ',
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
  | securePost (privsUser) ('/session-allow-analytical', gvBodyParams ([
      basicBooleanValidator ('allow'),
    ],
    ({ req, res }, allow=10) => {
      const sessionId = res | getSessionIdResponse (req)
      // --- response has already been sent
      if (nil (sessionId)) return
      decorateAndRethrow (
        '/user-allow-analytical: db call failed: ',
        () => updateAllowAnalytical (sessionId, allow),
      )
      return res | sendStatus (200, null)
    },
  ))
  | secureDelete (privsAdminUser) ('/user-admin/:email', gvRequestParams ([
      basicEmailValidator ('email'),
    ],
    ({ res, }, email) => {
      doDbCall (dbUserRemove, [email])
      return res | sendStatus (200, null)
    }),
  )
  | securePut (privsAdminUser) ('/user-admin/', gvBodyParams ([
      basicEmailValidator ('email'),
      basicStringValidator ('firstName'),
      basicStringValidator ('lastName'),
      basicStringListValidator ('privileges'),
      basicBooleanValidator ('sendEmail'),
    ],
    ({ res, }, email, firstName, lastName, privileges, sendEmail) => {
      doDbCall (dbUserAdd, [email, firstName, lastName, privileges, ], null)
      sendEmail | ifTrue (
        () => sendInfoEmail (email, 'welcome')
          | then ((_mailInfo) => res | sendStatus (200, null))
          | recover ((e) => {
            warn (decorateRejection ('Error with /user-admin: ', e))
            res | sendStatus (599, {
              // --- @todo this message is getting swallowed in the front end
              umsg: 'User added but welcome email could not be sent',
            })
          }),
        () => res | sendStatus (200, null),
      )
    },
  ))
  | post ('/user/reset-password', gvBodyParams ([
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
        // --- @todo if a user tries to use the same reset link twice, it will result in
        // serverError, while userError would be nicer because it will at least give them an
        // informative message.
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
  | securePost (privsAdminUser) ('/user/send-welcome-email', gvBodyParams ([
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
  | post ('/user/send-reset-email', gvBodyParams ([
      basicEmailValidator ('email'),
    ],
    ({ res }, to) => {
      const info = doDbCall (dbUserGet, [to])
      if (nil (info)) return res | sendStatus (200, null)
      return sendInfoEmail (to, 'reset')
      | then ((_mailInfo) => res | sendStatus (200, null))
      | recover ((e) => {
        warn (decorateRejection ('Error with /user/reset-welcome-email: ', e))
        res | sendStatusEmpty (500)
      })
    },
  ))
  | secureGet (privsAdminUser) ('/user-admin/users', (_req, res) => {
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
staleSessionCheckTimeoutMs | setIntervalOn (
  () => clearStaleSessions (staleSessionSecs * 1000),
)
// --- @future separate script to manage users
// --- set config key `users` to `null` or an empty list to not add default
// users on startup
if (schemaVersion >= 4) dbInitUsers (encrypt, users ?? [], envIsDevOrTst)

init ({ port: serverPort, })
