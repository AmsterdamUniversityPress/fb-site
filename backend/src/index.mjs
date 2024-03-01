import {
  pipe, compose, composeRight,
  sprintf1, sprintfN, tryCatch, lets, id, die,
  nil, ifOk, T, F, gt, tap,
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
import { env, lookupOnOrDie, } from './util.mjs'

import {
  main as initExpressJwt,
  secureMethod,
} from 'alleycat-express-jwt'

import dataTst from '../../__data/fb-data-tst.json' with { type: 'json', }
import dataAcc from '../../__data/fb-data-acc.json' with { type: 'json', }
import dataPrd from '../../__data/fb-data-prd.json' with { type: 'json', }

const data = process.env.APP_ENV | lookupOnOrDie (
  'Invalid/missing APP_ENV (got ' + process.env.APP_ENV + ')',
  { tst: dataTst, acc: dataAcc, prd: dataPrd, }
)

const configTop = config | configure.init

const { serverPort, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets ('serverPort')
)

const jwtSecret = lets (
  () => [
    'must be longer than 25 characters',
    length >> gt (25),
  ],
  (validate) => env ('JWT_SECRET', validate),
)

const cookieSecret = lets (
  () => [
    'must be longer than 25 characters',
    length >> gt (25),
  ],
  (validate) => env ('COOKIE_SECRET', validate),
)

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
      ({ email, firstName, lastName, password, expires, }) => ({
          password,
          userinfo: {
            email,
            firstName,
            lastName,
            expires,
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
  isLoggedIn: (email) => loggedIn.has (email),
  jwtSecret,
  onLogin: (email, _user) => loggedIn.add (email),
  onLogout: (email, done) => {
    if (loggedIn.delete (email)) return done (null)
    return done ('Unexpected, ' + email + ' not found in `loggedIn`')
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
  | listen (port) (() => {
    String (port) | green | sprintf1 ('listening on port %s') | info
  })

init ({ port: serverPort, })
