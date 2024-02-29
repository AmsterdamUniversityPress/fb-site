import {
  pipe, compose, composeRight,
  sprintf1, tryCatch, lets, id,
  whenPredicate, noop, take, nil, ifOk,
} from 'stick-js/es'

import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import express from 'express'

import { listen, use, sendStatus, } from 'alleycat-js/es/express'
import { yellow, green, red, } from 'alleycat-js/es/io';
import { ierror, info, decorateRejection, } from 'alleycat-js/es/general';
import { fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'

import { errorX, warn, } from './io.mjs';
import { init as initDb,
  // userAdd as dbUserAdd,
  userGet as dbUserGet,
  // userPasswordUpdate as dbUserPasswordUpdate,
} from './db.mjs';
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

const JWT_SECRET = 'W@#$*nxnvxcv9f21jn13!!**j123n,mns,dg;'
const COOKIE_SECRET = 'j248idvnxcNNj;;;091!@#%***'
const PASSWORD_SALT = Buffer.from ([
  0x75, 0x12, 0x23, 0x91, 0xAA, 0xAF, 0x53, 0x88, 0x90, 0xF1, 0xD4, 0xDD,
])
const PASSWORD_KEYLEN = 64
const hashPasswordScrypt = _hashPasswordScrypt (PASSWORD_SALT, PASSWORD_KEYLEN)

initDb (hashPasswordScrypt)

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

// --- @todo sqlite / redis
const loggedIn = new Set ()

// --- (String, Buffer) => Boolean
const checkPassword = (testPlain, knownHashed) => {
  return lets (
  () => hashPasswordScrypt (testPlain),
  (testHashed) => testHashed | bufferEquals (knownHashed),
)}

const { addMiddleware: addLoginMiddleware, } = initExpressJwt ({
  checkPassword,
  getUser,
  isLoggedIn: (email) => loggedIn.has (email),
  jwtSecret: JWT_SECRET,
  onLogin: (email, _user) => loggedIn.add (email),
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
