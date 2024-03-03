import {
  pipe, compose, composeRight,
  sprintf1, tryCatch, lets, id,
  ifOk, gt, tap, againstAny, eq, die,
} from 'stick-js/es'

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
  main as initExpressJwt,
  secureMethod,
// } from 'alleycat-express-jwt'
} from './alleycat-express-jwt/index.mjs'

import dataTst from '../../__data/fb-data-tst.json' with { type: 'json', }
import dataAcc from '../../__data/fb-data-acc.json' with { type: 'json', }
import dataPrd from '../../__data/fb-data-prd.json' with { type: 'json', }

const configTop = config | configure.init

const { serverPort, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets ('serverPort')
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

const secureGet = secureMethod ('get')
// const securePost = secureMethod ('post')
// ...

// --- must return { password, userinfo, }, where userinfo is an arbitrary
// structure which will be made available to the frontend, or `null`
const getUser = (email) => {
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

// --- @todo persist in sqlite
const loggedIn = new Set ()

// --- (String, Buffer) => Boolean
const checkPassword = (testPlain, knownHashed) => bcrypt.compareSync (testPlain, knownHashed)

const { addMiddleware: addLoginMiddleware, } = initExpressJwt ({
  checkPassword,
  getUser,
  isLoggedIn: async (email, _) => {
    // if db error, die (...)
    if (!loggedIn.has (email)) return [false, null]
    return [true]
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

const init = ({ port, }) => express ()
  | use (bodyParser.json ())
  | use (cookieParser (cookieSecret))
  | addLoginMiddleware
  | secureGet ('/fondsen', (req, res) => {
    const { query, } = req
    const { beginIdx, number, } = query
    // --- @todo check / validate
    console.log ('query', query)
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
