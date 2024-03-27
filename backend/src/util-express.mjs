import {
  pipe, compose, composeRight,
  id, recurry, sprintf1,
  againstAll, T, ok, not,
} from 'stick-js/es'

import { sendStatus, } from 'alleycat-js/es/express'
import { trim, } from 'alleycat-js/es/general'

import { eachAbort, } from './util.mjs'

const isNonEmptyAlphaNumericString = (x) => ok (x.match (
  // --- unicode-aware version of /^[\d\w]$/
  /^[\d\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Connector_Punctuation}\p{Join_Control}]+$/u,
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

export const getAndValidateQuery = _getAndValidate ((req) => req.query)
export const getAndValidateRequestParams = _getAndValidate ((req) => req.params)
// --- note that req.body.data is hardcoded.
// (the extra '.data' is just a convention we use in our frontend)
export const getAndValidateBodyParams = _getAndValidate ((req) => req.body.data)

export const basicValidator = (param, validate=T, transform=id, preValidate=T) => [
  param,
  validate,
  trim >> transform,
  againstAll ([ok, preValidate]),
]

export const basicStringValidator = (param, validate=T, transform=id, preValidate=T) => basicValidator (
  param,
  againstAll ([validate, isNonEmptyAlphaNumericString]),
  transform,
  preValidate,
)

export const basicEmailValidator = (param, validate=T, transform=id, preValidate=T) => basicValidator (
  param,
  againstAll ([validate, isValidEmail]),
  transform,
  preValidate,
)
