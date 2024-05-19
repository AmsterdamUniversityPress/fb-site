import {
  pipe, compose, composeRight,
  id, recurry, sprintf1, head,
  againstAll, allAgainst, T, ok, not, join,
  lets, reduce, tap, map, whenOk, ifOk,
} from 'stick-js/es'

import zxcvbn from 'zxcvbn'

import { sendStatus, } from 'alleycat-js/es/express'
import { trim, logWith, } from 'alleycat-js/es/general'
import { isEmptyString, } from 'alleycat-js/es/predicate'

import { eachAbort, ifEmptyList, regexAlphaNum, regexAlphaNumSpace, toListSingleton, toListCollapseUndefined, } from './util.mjs'

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

const abortGetAndValidate = Symbol ()

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
    if (aborted) return abortGetAndValidate
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
 *        basicRequiredValidator ([isPositiveInt, Number], 'pageSize'),
 *        basicRequiredValidator ([isNonNegativeInt, Number], 'pageNum'),
 *      ]),
 *    ], ({ res }, query, pageSize, pageNum) => ...
 */

const getAndValidate = recurry (5) (
  (getAndValidates) => (cont) => (req) => (res) => (next) => {
    // --- @future use reduceAbort (no need to keep reducing after we already know there's a
    // problem)
    let aborted
    const [params, reqResNexts] = getAndValidates | reduce (
      ([collectParams, reqResNexts], gandv) => {
        // --- reqResNext is the same at each step, any one will do
        const f = (reqResNext, ... params) => {
          reqResNexts.push (reqResNext)
          collectParams.push (... params)
        }
        const ret = gandv (f, req, res, next)
        // --- one of the validators failed, and we have already sent 499 in the response.
        if (ret === abortGetAndValidate) {
          aborted = true
          return []
        }
        return [collectParams, reqResNexts]
      },
      [[], []],
    )
    if (aborted) {
      // --- we have already returned response with 499
      return
    }
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

export const basicValidator = recurry (3) (
  (required=true) => ([validate=T, transform=id, preValidate=T]) => (param) => [
    param,
    validate,
    transform,
    againstAll ([required ? ok : T, preValidate]),
  ],
)

export const basicRequiredValidator = basicValidator (true)
export const basicOptionalValidator = basicValidator (false)

// --- @future once we start dealing with optional values the whole thing gets more complicated
// (ifOk/whenOk etc.). Another option is to keep everything required, and use separate endpoints
// (for example /search and /search-with-filters)

// @todo refactor with basicStringListValidator?
// and do we want map (transform) (for example, one might want a reduce as transformation, which is
// not possible now).
//
// @todo
// this is a bit funky now .. The thing is, param can be undefined, x, or [xs], and we transform it
// into a list (either [], [x] or [xs]). That should be convenient. So that's why we need the
// toListCollapseUndefined (which we could also put into the transform instead!)
// Then, allAgainst (T) [] is false .. which, I guess, is a matter of convention. In this case, true
// would have been more practical, but now we can fix that with the ifEmptyList.
export const basicListValidator = recurry (3) (
  (required=true) => ([validate=T, transform=id, preValidate=T]) => (param) => [
    param,
    ifEmptyList (
      T,
      allAgainst (validate),
    ),
    toListCollapseUndefined >> transform,
    againstAll ([required ? ok : T, ifOk (allAgainst (preValidate), T)]),
  ]
)

export const basicStringValidator = (param) => basicRequiredValidator (
  [isNonEmptyString],
  param,
)

export const basicAlphaNumericStringValidator = (param) => basicRequiredValidator (
  [isNonEmptyAlphaNumericString],
  param,
)

export const basicPasswordValidator = (minimumPasswordScore) => (param) => basicRequiredValidator (
  [againstAll ([isNonEmptyString, isStrongPassword (minimumPasswordScore)])],
  param,
)

export const basicBase64StringValidator = (param) => basicRequiredValidator (
  [isNonEmptyBase64String],
  param,
)

export const basicStringListValidator = (param) => [
  param,
  allAgainst (trim >> isNonEmptyAlphaNumericString),
  id,
  ok,
]

export const basicUUIDValidator = (param) => basicRequiredValidator (
  [isNonEmptyUUID],
  param,
)

export const basicEmailValidator = (param) => basicRequiredValidator (
  [isValidEmail],
  param,
)
