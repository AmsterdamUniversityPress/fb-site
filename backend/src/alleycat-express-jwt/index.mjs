import {
  pipe, compose, composeRight,
  tap, nil, map, die, mergeM, always,
  ifOk, ifTrue, whenFalse, not, lets, ok,
  join, concat, factory, factoryProps,
} from 'stick-js/es'

import jwtModule from 'jsonwebtoken'
import passport from 'passport'
import localStrategy from 'passport-local'
import { Strategy as JWTStrategy, } from 'passport-jwt'

import { recover, rejectP, resolveP, then, } from 'alleycat-js/es/async'
import {
  getN, post, postN, send, sendStatus, sendStatusEmpty,
  use,
  methodWithMiddlewares, methodNWithMiddlewares, method3WithMiddlewares,
} from 'alleycat-js/es/express'
import { between, composeManyRight, decorateRejection, logWith, } from 'alleycat-js/es/general'
import { warn, } from 'alleycat-js/es/io'

import { foldContinuation, mkPromise, startContinuation, } from './auth-continuation.mjs'
import { flatMap, noopP, okOrDie, } from './util.mjs'
import { bufferEqualsConstantTime, hashPasswordScrypt, } from './util-crypt.mjs'

export { bufferEqualsConstantTime, hashPasswordScrypt, }

// --- must return String or null
const jwtFromSignedCookie = (req) => req.signedCookies.jwt ?? null

const getCookieOptions = (secure=true) => ({
  secure,
  httpOnly: true,
  sameSite: true,
  signed: true,
})

const composeAuthMiddlewares = (middlewares) => {
  return (req, res, next) => {
    const umsgs = []

    const mkf = (mw) => (umsg) => {
      // --- @future probably a fun puzzle to make this work like `sequenceA` in Haskell, but then
      // async ... a puzzle for another day in any case
      if (ok (umsg)) umsgs.push (umsg)
      return mkPromise (mw) (req, res)
    }
    /* Ιn other words:
     *
     *   <promise containing a starting condition>
     *   | then (flatMap (
     *     // --- this means the previous middleware failed to authorize
     *     (umsg) => ... return a new continuation ...
     *   ))
     *   | then (flatMap ((umsg) => ...)
     *   | ...
     *
     */
    const chain = composeManyRight (... middlewares | map (
      then << flatMap << mkf,
    ))
    resolveP (startContinuation)
    | chain
    | then (foldContinuation (
      // --- authorized
      () => next (),
      // --- not authorized
      (lastUmsg) => lets (
        () => lastUmsg | ifOk (() => [lastUmsg], () => []),
        (lastUmsg_) => umsgs | concat (lastUmsg_) | join (','),
        (_, umsg) => next ({ umsg, status: 499, }),
      ),
      // --- internal error
      (imsg) => next ({ imsg, status: 599, }),
    ))
    | recover ((e) => lets (
      () => e | decorateRejection ('composeAuthMiddlewares (): '),
      (imsg) => next ({ imsg, status: 599, }),
    ))
  }
}

/* Middleware which works the same as the convenience form
 *
 *   passport.authenticate ('jwt', { session: false, })
 *
 * but provides us more fine-grained control over especially the error modes.
 *
 * The second argument to the callback function is called `user` in the documentation, but we
 * enhance it with a reason that the login failed, if any. (This callback is called by us at the end
 * of the `use ('jwt', ...)` function.
 *
 * It's not really clear where `info` and `status` come from (`info` could be an exception
 * for example) so we ignore them.
 */

const passportAuthenticateJWT = () => (req, res, next) => {
  passport.authenticate ('jwt', (err, user, _info, _status) => {
    // --- once we're here, it means 1) the JWT was decoded and our callback to JWTStrategy was
    // called or 2) the JWT could not be decoded.

    // --- case 1) with an internal error, or some other internal error perhaps -> return 500 (sent
    // by express)
    if (err) return next ({ status: 500, imsg: err, })
    const { reason='(reason unknown)', details, } = user
    // --- case 1) where the verify function returned false or null for user, i.e., the user
    // is not logged in, or case 2) -> return 499
    // --- @future 499 is currently hardcoded
    if (not (details)) return next ({ status: 499, umsg: 'Unauthorized: ' + reason, })
    // --- logged in: set `req.user` and do not do anything with sessions (the only thing we
    // store in the cookie is the JWT itself, and that is done during the `login` middleware)
    req.user = details
    return next (null)
  }) (req, res, next)
}

const requestAuthenticate = (getUserinfoRequest, isAuthorizedRequest) => (req, _res, next) => {
  if (nil (isAuthorizedRequest)) return next ({ status: 499, })
  isAuthorizedRequest (req)
  | then (([loggedIn, reason]) => loggedIn | ifTrue (
    () => {
      const userinfo = getUserinfoRequest (req)
      // --- @todo can we just keep username empty?
      req.user = { userinfo, username: '<ip-based>', }
      return next ()
    },
    () => next ({ status: 499, umsg: reason, }),
  ))
  | recover ((e) => lets (
    // --- in case it's an exception
    () => e.toString (),
    (es) => es | decorateRejection ('requestAuthenticate (): isLoggedInRequest: '),
    (_, imsg) => next ({ imsg, status: 599, }),
  ))
}

// --- error handler (note single callback with 4 arguments): can be added
// at the end as app-level or route-level middleware (at the end in both cases).
const customErrorHandler = (err, _req, res, _next) => {
  // --- we assume err is an exception if it has a stack and a message
  if (err.stack && err.message) {
    warn (err)
    return res | sendStatusEmpty (599)
  }
  // --- custom error with code (`umsg` and `imsg` are assumed to be strings)
  const defaultMessage = { umsg: 'Internal error', imsg: 'Internal error', }
  const { status, umsg=defaultMessage, imsg, } = err
  if (status | between (500, 599)) warn ('Middleware error:', umsg, imsg)
  return res | sendStatus (status, umsg)
}

const initPassportStrategies = ({
  jwtSecret, getUserinfoLogin, checkAuthorized, checkPassword,
  usernameField, passwordField,
}) => {
  passport.use ('login', new localStrategy (
    // --- on failure to retrieve these, this will result in roughly
    //   `done (null, null, { message: 'Missing credentials', })`
    { usernameField, passwordField, },
    (username, password, done) => {
      const user = getUserinfoLogin (username)
      if (!user)
        return done (null, false, { message: 'User not found', })
      const { password: passwordFromDb, userinfo, } = user
      if (!passwordFromDb || !userinfo)
        return done ('Invalid user object', false, { message: 'Internal error', })
      if (!checkPassword (password, passwordFromDb))
        return done (null, false, { message: 'Wrong Password', })
      return done (null, { username, userinfo, }, { message: 'logged in successfully', })
    }
  ))

  passport.use ('jwt', new JWTStrategy (
    {
      passReqToCallback: true,
      jwtFromRequest: jwtFromSignedCookie,
      secretOrKey: jwtSecret,
    },
    // --- once we're here, it means that the JWT was valid and we were able to decode it.
    (req, { username }, done) => {
      return checkAuthorized (username, req)
      | then (([userinfo, reason]) => done (
        null,
        userinfo | ifOk (
          // --- 200, user object is now available as `req.user`
          () => ({
            reason: null,
            details: { username, userinfo, },
          }),
          // --- 401, not logged in (login was invalidated somehow without /logout having been called)
          () => ({
            reason,
            details: null,
          }),
        ),
      ))
      // --- 500
      | recover ((e) => done (e, null))
    },
  ))
}

/*
 * `getUserinfoLogin` (required) gets the info for a user who logs in with
 * username and password. It takes the username and must return { password,
 * userinfo, }, where userinfo is an arbitrary structure, or `null` if the
 * username is invalid.
 *
 * `getUserinfoRequest` (optional) takes the request and returns an
 * arbitrary `userinfo` object.
 *
 * The `userinfo` object will be sent to the frontend in the response to
 * the /hello, /login, and other secured routes.
 *
 * The structure { username, userinfo, } will be made available to the
 * middleware/routing functions as `req.user` after the JWT is successfully
 * decoded.
 *
 * Note that this is not what is stored in the JWT. Currently only the
 * username is stored there.
 *
 * `checkPassword` :: (String, Buffer) -> Boolean
 */

const init = ({
  checkPassword,
  getUserinfoLogin,
  getUserinfoRequest=always ({}),
  isAuthorizedBeforeJWT=null,
  isAuthorizedAfterJWT=null,
  isAuthorized,
  jwtSecret,
  onLogin=noopP,
  onLogout=noopP,
  routeHello='/hello',
  routeLogin='/login',
  routeLogout='/logout',
  // --- the login route can return a response with a JSON body with this code, indicating a client
  // error.
  clientErrorJSONCode=499,
  // --- ditto, for a server error. Currently thrown by 3 routes, `onLogout`, and `onLogin`.
  serverErrorJSONCode=599,
  usernameField='username',
  passwordField='password',
}) => {
  // --- caller must catch rejection
  const checkAuthorized = (username, req) => {
    const user = getUserinfoLogin (username)
    // --- for example, removed from database while the user still has a valid JWT
    if (nil (user)) return [null, 'User was removed / no longer valid']
    const { userinfo, } = user
    return isAuthorized (username, userinfo, req)
    | then (([loggedIn, reason]) => loggedIn | ifTrue (
      () => [userinfo],
      () => [null, reason],
    ))
  }
  initPassportStrategies ({
    jwtSecret, getUserinfoLogin, checkAuthorized, checkPassword,
    usernameField, passwordField,
  })
  // --- note that the cookie must be cleared with exactly the same options as it was set with,
  // meaning that if for some reason /login and /logout are not both http or both https (during
  // development for example), the cookie won't get cleared and there may be bizarre results.
  const doCookie = (req) => lets (
    () => getCookieOptions (req.secure),
    (cookieOptions) => ({
      clear: (res) => res.clearCookie ('jwt', cookieOptions),
      set: (jwt) => (res) => res.cookie ('jwt', jwt, cookieOptions),
    }),
  )
  const authMiddleware = composeAuthMiddlewares ([
    requestAuthenticate (getUserinfoRequest, isAuthorizedBeforeJWT),
    passportAuthenticateJWT (),
    requestAuthenticate (getUserinfoRequest, isAuthorizedAfterJWT),
  ])

  const useAuthMiddleware = composeManyRight (
    // --- all routes with the passport 'jwt' middlreturns return 499 if either the JWT is missing
    // or invalid, or if the user inside the JWT is not logged in, and 200 if the user is logged in.
    getN (routeHello, [
      authMiddleware,
      (req, res) => {
        const { user, } = req
        if (!user) return res | sendStatus (serverErrorJSONCode, {
          imsg: routeHello + ': missing user info',
        })
        const { userinfo, ... _ } = user
        return res | send ({ data: userinfo, })
      },
      customErrorHandler,
    ]),
    post (routeLogin, (req, res) => {
      const cookie = doCookie (req)
      res | cookie.clear
      // --- note, automatically calls req.login, a passort function (see
      // https://www.passportjs.org/concepts/authentication/login); we don't
      // call req.logout.
      passport.authenticate ('login', (err, user, { message, }={}, ) => {
        if (err) {
          warn ('Error with login:', err)
          return res | cookie.clear | sendStatus (serverErrorJSONCode, {
            imsg: null,
            umsg: 'Server error during login (see logs)',
          })
        }
        if (!user) return res | sendStatus (clientErrorJSONCode, {
          umsg: 'Invalid login: ' + message,
        })
        const { username, userinfo, } = user
        const jwt = jwtModule.sign ({ username, }, jwtSecret)
        res | cookie.set (jwt)
        // --- not expected to return anything
        onLogin (username, user)
          | recover (rejectP << decorateRejection ('onLogin: '))
          | recover ((e) => {
            warn (e)
            res | sendStatus (serverErrorJSONCode, {
              imsg: e.toString (),
            })
            return true
          })
          | then ((sent=false) => sent | whenFalse (
            () => res | send ({ data: userinfo, }),
          ))
      }) (req, res)
    }),
    postN (routeLogout, [
      passportAuthenticateJWT (),
      (req, res) => {
        doCookie (req).clear (res)
        const username = req.user.username
        if (!username) return res | sendStatus (serverErrorJSONCode, {
          imsg: 'req.user.username was empty',
        })
        // --- not expected to return anything
        onLogout (username)
          | recover (rejectP << decorateRejection ('onLogout: '))
          | recover ((e) => {
            warn (e)
            res | sendStatus (serverErrorJSONCode, {
              imsg: e.toString (),
            })
            return true
          })
          | then ((stop=false) => stop | whenFalse (
            () => res | send ({}),
          ))
      },
    ]),
    use (customErrorHandler),
  )
  return { useAuthMiddleware, authMiddleware, }
}

const authProto = {
  // --- this had the side effect of initialising the passport strategies inside the passport
  // module, probably as mutable state.
  init (... args) {
    const { useAuthMiddleware, authMiddleware, } = init (... args)
    return this | mergeM ({
      _useAuthMiddleware: useAuthMiddleware,
      _authMiddleware: authMiddleware,
    })
  },
  getUseAuthMiddleware () {
    return this._useAuthMiddleware | okOrDie ('not available (forgot to call init?)')
  },
  getAuthMiddleware () {
    return this._authMiddleware | okOrDie ('not available (forgot to call init?)')
  },
  secureMethodN ({ prepend=[], append=[], errorHandler=customErrorHandler, }={}) {
    return methodNWithMiddlewares (
      [... prepend, this.getAuthMiddleware (), ... append, errorHandler],
    )
  },
  secureMethod ({ prepend=[], append=[], errorHandler=customErrorHandler, }={}) {
    return methodWithMiddlewares (
      [... prepend, this.getAuthMiddleware (), ... append, errorHandler],
    )
  },
  secureMethod3 ({ prepend=[], append=[], errorHandler=customErrorHandler, }={}) {
    return method3WithMiddlewares (
      [... prepend, this.getAuthMiddleware (), ... append, errorHandler],
    )
  },
}

const props = {
  _authMiddleware: void 8,
  _useAuthMiddleware: void 8,
}

export const authFactory = authProto | factory | factoryProps (props)
