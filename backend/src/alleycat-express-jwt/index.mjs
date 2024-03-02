import {
  pipe, compose, composeRight,
  ifPredicateResults, noop, nil,
  ifOk, ifTrue,
} from 'stick-js/es'

import jwtModule from 'jsonwebtoken'
import passport from 'passport'
import localStrategy from 'passport-local'
import { Strategy as JWTStrategy, } from 'passport-jwt'

import { recover, then, } from 'alleycat-js/es/async'
import {
  getN, post, postN, send, sendStatus,
  methodWithMiddlewares, methodNWithMiddlewares, method3WithMiddlewares,
} from 'alleycat-js/es/express'
import { composeManyRight, logWith, } from 'alleycat-js/es/general'
import { warn, } from 'alleycat-js/es/io'

import {
  bufferEqualsConstantTime,
  hashPasswordScrypt,
} from './util-crypt.mjs'

export { bufferEqualsConstantTime, hashPasswordScrypt, }

const jwtMiddleware = passport.authenticate ('jwt', { session: false, })
export const secureMethodN = methodNWithMiddlewares ([jwtMiddleware])
export const secureMethod = methodWithMiddlewares ([jwtMiddleware])
export const secureMethod3 = method3WithMiddlewares ([jwtMiddleware])

// --- must return String or null
const jwtFromSignedCookie = (req) => req.signedCookies.jwt ?? null

const getCookieOptions = (secure=true) => ({
  secure,
  httpOnly: true,
  sameSite: true,
  signed: true,
})

const initStrategies = ({
  jwtSecret/* , ifLoggedInUserinfo */, getUser, getUserinfo, checkPassword,
  usernameField, passwordField,
}) => {
  passport.use (
    'login',
    new localStrategy (
      // --- on failure to retrieve these, this will result in roughly
      //   `done (null, null, { message: 'Missing credentials', })`
      { usernameField, passwordField, },
      (username, password, done) => {
        const user = getUser (username)
        if (!user)
          return done (null, false, { message: 'User not found', })
        const { password: passwordFromDb, userinfo, } = user
        if (!passwordFromDb || !userinfo)
          return done ('Invalid user object', false, { message: 'Internal error', })
        if (!checkPassword (password, passwordFromDb))
          return done (null, false, { message: 'Wrong Password', })
        return done (null, { username, userinfo, }, { message: 'logged in successfully', })
      }
    ),
  )

  passport.use ('jwt', new JWTStrategy (
    { jwtFromRequest: jwtFromSignedCookie, secretOrKey: jwtSecret, },
    // --- once we're here, it means that the JWT was valid and we were able to decode it.
    ({ username }, done) => {
      return getUserinfo (username)
      | then (([userinfo, reason]) => done (
        null,
        userinfo | ifOk (
          // --- 200, user object is now available as `req.user`
          () => ({ username, userinfo, }),
          // --- 401, not logged in (login was invalidated somehow without /logout having been called)
          // --- @todo reason
          () => false,
        ),
      ))
      // --- 500
      | recover ((e) => done (e, null))
    },
  ))
}

/*
 * `getUser` must return { password, userinfo, }, where userinfo is an
 * arbitrary structure, or `null` if the username is invalid.
 *
 * This structure will be sent to the frontend in the response to the both
 * the /hello and /login routes.
 *
 * The structure { username, userinfo, } will be made available on each
 * request as `req.user` after the JWT is successfully decoded.
 *
 * Note that this is not what is stored in the JWT, which is currently
 * only the username.
 *
 * `checkPassword` :: (String, Buffer) -> Boolean
 */

export const main = ({
  checkPassword,
  getUser,
  isLoggedIn,
  jwtSecret,
  onLogin=noop,
  onLogout=noop,
  routeHello='/hello',
  routeLogin='/login',
  routeLogout='/logout',
  // --- the login route can return a response with a JSON body with this code, indicating a client
  // error.
  clientErrorJSONCode=499,
  // --- @todo isLoggedIn
  // --- ditto, for a server error. Currently thrown by 3 routes, `onLogout`, and `onLogin`.
  serverErrorJSONCode=599,
  usernameField='username',
  passwordField='password',
}) => {
  const getUserinfo = (email) => {
    const user = getUser (email)
    // --- for example, removed from database while the user still has a valid JWT
    if (nil (user)) return [null, 'User was removed / no longer valid']
    const { userinfo, } = user
    return isLoggedIn (email, userinfo)
    | then (([loggedIn, reason]) => loggedIn | ifTrue (
      () => [userinfo],
      () => [null, reason],
    ))

    if (err) return [err, null, null]
    if (loggedIn !== true) return [null, null, reason]
    // if (!isLoggedIn (email, user ? user.userinfo : null)) return [null, false, ]
    if (nil (user)) return [
      'Unexpected, unable to get user info for logged in user', null, null,
    ]
    return [null, user.userinfo]
  }
  // const ifLoggedInUserinfo = getUserinfo | ifPredicateResults
  initStrategies ({
    jwtSecret/* , ifLoggedInUserinfo */, getUser, getUserinfo, checkPassword,
    usernameField, passwordField,
  })
  const addMiddleware = composeManyRight (
    // --- all routes with the passport 'jwt' middlreturns return 401 if either the JWT is missing
    // or invalid, or if the user inside the JWT is not logged in, and 200 if the user is logged in.
    getN (routeHello, [
      passport.authenticate ('jwt', { session: false, }),
      (req, res) => {
        const { user, } = req
        if (!user) return res | sendStatus (serverErrorJSONCode, {
          imsg: routeHello + ': missing user info',
        })
        const { userinfo, ... _ } = user
        return res | send ({ data: userinfo, })
      },
    ]),
    post (routeLogin, (req, res) => {
      const cookieOptions = getCookieOptions (req.secure)
      res.clearCookie ('jwt', cookieOptions)
      // --- note, automatically calls req.login, a passort function (see
      // https://www.passportjs.org/concepts/authentication/login); we don't
      // call req.logout.
      passport.authenticate ('login', (err, user, { message, }={}, ) => {
        if (err) {
          warn ('Error with login:', err)
          return res | sendStatus (serverErrorJSONCode, {
            imsg: null,
            umsg: 'Server error during login (see logs)',
          })
        }
        if (!user) return res | sendStatus (clientErrorJSONCode, {
          umsg: 'Invalid login: ' + message,
        })
        const { username, userinfo, } = user
        const jwt = jwtModule.sign ({ username, }, jwtSecret)
        res.cookie ('jwt', jwt, cookieOptions)
        onLogin (username, user, (err) => {
          if (err) return res | sendStatus (serverErrorJSONCode, {
            imsg: 'onLogin: ' + err,
          })
        })
        return res | send ({ data: userinfo, })
      }) (req, res)
    }),
    postN (routeLogout, [
      passport.authenticate ('jwt', { session: false, }),
      (req, res) => {
        res.clearCookie ('jwt', getCookieOptions (req.secure))
        const username = req.user.username
        if (!username) return res | sendStatus (serverErrorJSONCode, {
          imsg: 'req.user.username was empty',
        })
        onLogout (username, (err) => {
          if (err) return res | sendStatus (serverErrorJSONCode, {
            imsg: 'onLogout: ' + err,
          })
        })
        return res | send ({})
      },
    ])
  )
  return { addMiddleware, }
}
