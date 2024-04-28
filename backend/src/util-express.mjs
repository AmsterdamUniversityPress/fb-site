import {
  pipe, compose, composeRight,
  id, recurry, sprintf1, head,
  againstAll, allAgainst, T, ok, not, join,
  lets, reduce, tap,
} from 'stick-js/es'

import zxcvbn from 'zxcvbn'

import { sendStatus, } from 'alleycat-js/es/express'
import { trim, logWith, } from 'alleycat-js/es/general'
import { isEmptyString, } from 'alleycat-js/es/predicate'

import { eachAbort, regexAlphaNum, regexAlphaNumSpace, } from './util.mjs'

const isNonEmptyString = isEmptyString >> not
const isStrongPassword = recurry (2) (
  (minimumPasswordScore) => (pw) => zxcvbn (pw).score >= minimumPasswordScore,
)

const isNonEmptyXString = (mkRe1) => lets (
  () => mkRe1 ('+'),
  (re1) => new RegExp ('^' + re1.source + '$', re1.flags),
  (_ , re) => (x) => ok (x.match (re)),
)

const isNonEmptyAlphaNumericString = isNonEmptyXString (regexAlphaNum)
const isNonEmptyAlphaNumericSpaceString = isNonEmptyXString (regexAlphaNumSpace)

const isNonEmptyBase64String = (x) => ok (x.toLowerCase ().match (
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
))

const isNonEmptyUUID = (x) => ok (x.match (
  /^[0-9a-f-]+$/,
))

// --- from emailregex.com
// --- control characters (\x01, \x02 etc.) seem weird and annoy the linter but are actually valid for some reason
const isValidEmail = (x) => ok (x.match (
  /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/,
))

export const _getAndValidate = recurry (6) (
  (getParams) => (spec) => (cont) => (req) => (res) => (next) => {
    const params = getParams (req)
    const paramVals = []
    const aborted = spec | eachAbort ((abort, [param, validate, transform=id, preValidate=T]) => {
      // --- allow nil (leave it to the validate function, which is required, to deal with)
      const paramVal = params [param]
      if (not (preValidate (paramVal))) {
        res | sendStatus (499, { umsg: param | sprintf1 ('Invalid value for field “%s”'), })
        abort ()
        return
      }
      const transformed = paramVal | transform
      if (not (validate (transformed))) {
        res | sendStatus (499, { umsg: param | sprintf1 ('Invalid value for field “%s”'), })
        abort ()
        return
      }
      paramVals.push (transformed)
    })
    if (aborted) return
    return cont ({ req, res, next, }, ... paramVals)
  },
)

export const gvQuery = _getAndValidate ((req) => req.query)
export const gvRequestParams = _getAndValidate ((req) => req.params)
// --- note that req.body.data is hardcoded.
// (the extra '.data' is just a convention we use in our frontend)
export const gvBodyParams = _getAndValidate ((req) => req.body.data)

/* Usage:
 *
 *  secureGet (privsUser) ('/path/:query', gv (
 *    [
 *      gvRequestParams ([
 *        basicStringValidator ('query'),
 *      ]),
 *      gvQuery ([
 *        basicValidator ('pageSize', isPositiveInt, Number),
 *        basicValidator ('pageNum', isNonNegativeInt, Number),
 *      ]),
 *    ], ({ res }, query, pageSize, pageNum) => ...
 */

const getAndValidate = recurry (5) (
  (getAndValidates) => (cont) => (req) => (res) => (next) => {
    const [params, reqResNexts] = getAndValidates | reduce (
      ([collectParams, reqResNexts], gandv) => {
        // --- reqResNext is the same at each step, any one will do
        const f = (reqResNext, ... params) => {
          reqResNexts.push (reqResNext)
          collectParams.push (... params)
        }
        gandv (f, req, res, next)
        return [collectParams, reqResNexts]
      },
      [[], []],
    )
    return cont (reqResNexts | head, ... params)
  },
)

export const gvN = getAndValidate
export const gv = recurry (5) (
  (gvf1) => gvN ([gvf1]),
)
export const gv2 = recurry (6) (
  (gvf1) => (gvf2) => gvN ([gvf1, gvf2]),
)
export const gv3 = recurry (7) (
  (gvf1) => (gvf2) => (gvf3) => gvN ([gvf1, gvf2, gvf3]),
)

export const basicValidator = (param, validate=T, transform=id, preValidate=T) => [
  param,
  validate,
  trim >> transform,
  againstAll ([ok, preValidate]),
]

export const basicStringValidator = (param, validate=T, transform=id, preValidate=T) => basicValidator (
  param,
  againstAll ([validate, isNonEmptyString]),
  transform,
  preValidate,
)

export const basicAlphaNumericStringValidator = (param, validate=T, transform=id, preValidate=T) => basicValidator (
  param,
  againstAll ([validate, isNonEmptyAlphaNumericString]),
  transform,
  preValidate,
)

export const basicPasswordValidator = (minimumPasswordScore) => (param, validate=T, transform=id, preValidate=T) => basicValidator (
  param,
  againstAll ([validate, isNonEmptyString, isStrongPassword (minimumPasswordScore)]),
  transform,
  preValidate,
)

export const basicBase64StringValidator = (param, validate=T, transform=id, preValidate=T) => basicValidator (
  param,
  againstAll ([validate, isNonEmptyBase64String]),
  transform,
  preValidate,
)

export const basicStringListValidator = (param, validate=T, transform=id, preValidate=T) => [
  param,
  againstAll ([validate, allAgainst (trim >> isNonEmptyAlphaNumericString)]),
  transform,
  againstAll ([ok, preValidate]),
]


export const basicUUIDValidator = (param, validate=T, transform=id, preValidate=T) => basicValidator (
  param,
  againstAll ([validate, isNonEmptyUUID]),
  transform,
  preValidate,
)

export const basicEmailValidator = (param, validate=T, transform=id, preValidate=T) => basicValidator (
  param,
  againstAll ([validate, isValidEmail]),
  transform,
  preValidate,
)
