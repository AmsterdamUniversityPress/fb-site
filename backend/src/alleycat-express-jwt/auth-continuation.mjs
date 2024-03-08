import {
  pipe, compose, composeRight,
  tap, nil, sprintfN, tryCatch,
} from 'stick-js/es'

import daggy from 'daggy'

import { cata, fold3, } from 'alleycat-js/es/bilby'
import { between, decorateRejection, } from 'alleycat-js/es/general'

import { toJSON, } from './util.mjs'

/* Express middlewares work as follows: each middleware calls `next` when it's finished, either with
 * an argument (indicating an error, meaning jump out of the chain to the error handler) or with no
 * argument (indicating go to next middleware).
 *
 * We want a way to chain several authorization strategies, where you try them one by one and jump
 * out of the chaiiand it doesn't seem possible to do this idiomatically.
 *
 * The idea behind this is to provide a type with a `flatMap` method which means, do this if the
 * current middleware failed to authorize, but break out if it did authorize or if there is an
 * internal error. Then at the end of the chain you fold the result and decide what to do (probably
 * you'll call the `next` function of the current stage.
 */

const AuthContinuation = daggy.taggedSum ('Continuation', {
  AuthContinuationAuthorized: [],
  // --- `umsg` should be a string and gets sent in the response body.
  //
  // (We often send a response with code 499 and body = { umsg, })
  AuthContinuationNotAuthorized: ['umsg'],
  // --- `imsg` should be a string and stays in the back-end (it doesn't get sent in the response).
  //
  // This is a different `imsg` than the one we sometimes send to the front-end.
  //
  // (We often send response with code 599 and body = { imsg, } where `imsg` is an optional message
  // for the front-end developer (which is usually not very useful, but is available just in case))
  AuthContinuationError: ['imsg'],
})

const { AuthContinuationAuthorized, AuthContinuationNotAuthorized, AuthContinuationError, } = AuthContinuation
// export { AuthContinuationAuthorized, AuthContinuationNotAuthorized, AuthContinuationError, }

AuthContinuation.prototype.flatMap = function (f) {
  return this | cata ({
    AuthContinuationAuthorized: () => AuthContinuationAuthorized,
    AuthContinuationNotAuthorized: (umsg) => f (umsg),
    AuthContinuationError: (imsg) => AuthContinuationError (imsg),
  })
}

AuthContinuation.prototype.fold = function (f, g, h) {
  return this | cata ({
    AuthContinuationAuthorized: () => f (),
    AuthContinuationNotAuthorized: (lastUmsg) => g (lastUmsg),
    AuthContinuationError: (imsg) => h (imsg),
  })
}

export const startContinuation = AuthContinuationNotAuthorized (null)
export const foldContinuation = fold3

const mkContinuation = (nextParam) => {
  if (nil (nextParam)) return AuthContinuationAuthorized
  // --- err is (probably) an exception
  if (nextParam.stack && nextParam.message) return AuthContinuationError (
    'mkContinuation (): ' + nextParam.message,
  )
  // --- custom error with code
  const { status, umsg, imsg, } = nextParam
  if (status | between (400, 499)) return AuthContinuationNotAuthorized (umsg | toJSON)
  return AuthContinuationError (
    [status, umsg | toJSON, imsg | toJSON] | sprintfN (
      'mkContinuation (): unexpected code %d, umsg=%s, imsg=%s',
    ),
  )
}

export const mkPromise = mw => (req, res) => new Promise ((resolve, reject) => {
  const next = (nextParam) => tryCatch (
    resolve,
    // --- for when mkContinuation itself fails, for example if JSON.stringify fails
    reject << decorateRejection ('mkPromise: mkContinuation: '),
    () => mkContinuation (nextParam),
  )
  mw (req, res, next)
})
