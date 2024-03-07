import {
  pipe, compose, composeRight,
  tap, nil, sprintfN, tryCatch,
} from 'stick-js/es'

import daggy from 'daggy'

import { cata, fold3, } from 'alleycat-js/es/bilby'
import { between, decorateRejection, } from 'alleycat-js/es/general'

import { toJSON, } from './util.mjs'

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
