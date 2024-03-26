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

export const _getAndValidate = recurry (6) (
  (getParams) => (spec) => (cont) => (req) => (res) => (next) => {
    const params = getParams (req)
    const paramVals = []
    const aborted = spec | eachAbort ((abort, [param, validate, transform=id, preValidate=T]) => {
      // --- allow nil (leave it to the validate function, which is required, to deal with)
      const paramVal = params [param]
      if (not (preValidate (paramVal))) {
        res | sendStatus (499, { imsg: param | sprintf1 ('Invalid value for query param “%s”'), })
        abort ()
        return
      }
      const transformed = paramVal | transform
      if (not (validate (transformed))) {
        res | sendStatus (499, { imsg: param | sprintf1 ('Invalid value for query param “%s”'), })
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
