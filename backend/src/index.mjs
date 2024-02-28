import {
  pipe, compose, composeRight,
  sprintf1, tryCatch, lets, id, die,
  whenPredicate, noop,
} from 'stick-js/es'

import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import express from 'express'
import { dirname, } from 'path'

import { get, listen, use, sendStatus, } from 'alleycat-js/es/express'
import { yellow, green, red, } from 'alleycat-js/es/io';
import { info, decorateRejection, } from 'alleycat-js/es/general';
import { isLeft, fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'

import { errorX, mkdirIfNeeded, } from './io.mjs';
import { init as initDb, } from './db.mjs';
import { config, } from './config.mjs'

import {
  main as initExpressJwt,
  bufferEqualsConstantTime as bufferEquals,
  hashPasswordScrypt as _hashPasswordScrypt,
  secureMethod,
} from 'alleycat-express-jwt'

import data from '../../__data/fb-data-tst.json' with { type: 'json', }

const configTop = config | configure.init

const { serverPort, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets ('serverPort')
)

initDb ()

const secureGet = secureMethod ('get')
// const securePost = secureMethod ('post')
// ...

const JWT_SECRET = 'W@#$*nxnvxcv9f21jn13!!**j123n,mns,dg;'
const COOKIE_SECRET = 'j248idvnxcNNj;;;091!@#%***'
const PASSWORD_SALT = Buffer.from ([
  0x75, 0x12, 0x23, 0x91, 0xAA, 0xAF, 0x53, 0x88, 0x90, 0xF1, 0xD4, 0xDD,
])
const PASSWORD_KEYLEN = 64

const hashPasswordScrypt = _hashPasswordScrypt (PASSWORD_SALT, PASSWORD_KEYLEN)

const getCredentials = () => new Map ([
  ['allen@alleycat.cc', ['Allen', 'Haim', hashPasswordScrypt ('appel')]],
  ['arie@alleycat.cc', ['arie', 'bombarie', hashPasswordScrypt ('peer')]],
])
const credentials = getCredentials ()

// --- must return { password, userinfo, }, where userinfo is an arbitrary
// structure which will be made available to the frontend.
const getUser = (email) => {
  const user = credentials.get (email)
  if (!user) return null
  const [firstName, lastName, password] = user
  return {
    password,
    userinfo: {
      email,
      firstName,
      lastName,
    },
  }
}

const loggedIn = new Map ()

// --- (String, Buffer) => Boolean
const checkPassword = (testPlain, knownHashed) => lets (
  () => hashPasswordScrypt (testPlain),
  (testHashed) => testHashed | bufferEquals (knownHashed),
)

const { addMiddleware: addLoginMiddleware, } = initExpressJwt ({
  checkPassword,
  getUser,
  getUserinfo: (email) => loggedIn.get (email),
  jwtSecret: JWT_SECRET,
  onLogin: (email, user) => loggedIn.set (email, user),
  onLogout: (email, done) => {
    if (loggedIn.delete (email)) return done (null)
    return done ('Unexpected, ' + email + ' not found in `loggedIn`')
  },
  usernameField: 'email',
})

const init = ({ port, }) => express ()
  | use (bodyParser.json ())
  | use (cookieParser (COOKIE_SECRET))
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
