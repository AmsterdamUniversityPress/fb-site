import {
  pipe, compose, composeRight,
  concatTo, lt, bindProp, noop, die, always,
  bindTryProp, defaultTo, lets, invoke, ifOk, id, not,
  T, F, prop, condS, gt, guard, sprintf1, arg0, divideBy, reduce,
  tap, otherwise, recurry, concat, side2, remapTuples, mergeToM,
  againstAny, contains, containsV, flip,
  map, addIndex, ifTrue, ifPredicate, whenPredicate,
} from 'stick-js/es'

import { fold, } from 'alleycat-js/es/bilby'
import {
  doApiCall as _doApiCall, requestCompleteFold,
  RequestInit, RequestLoading, RequestError, RequestResults,
} from 'alleycat-js/es/fetch'
import { getQueryParams, } from 'alleycat-js/es/general'
import { all, allV, ifUndefined, isEmptyString, isEmptyList, whenEquals, } from 'alleycat-js/es/predicate'
import { componentTell, containerTell, useWhyTell, } from 'alleycat-js/es/react'
import { reducerTell, } from 'alleycat-js/es/redux'
import { saga as _saga, } from 'alleycat-js/es/saga'
import { initSelectorsTell, } from 'alleycat-js/es/select'
import { mediaRule, mgt, mlt, } from 'alleycat-js/es/styled'

// :: (a -> b) -> Maybe a -> b | undefined
export const foldWhenJust = recurry (2) (
  (f) => (mb) => mb | fold (f, void 8),
)

export const isNotEmptyString = not << isEmptyString
export const isNotEmptyList = not << isEmptyList
export const whenIsNotEmptyString = isNotEmptyString | whenPredicate
export const ifIsEmptyString = isEmptyString | ifPredicate

// --- functor map for `null` which treats it like `Nothing`
export const nullMap = recurry (2) (
  (f) => ifOk (f, () => null),
)

export const compose2 = (f, g) => recurry (2) (
  (a) => g << f (a),
)

export const againstNone = compose2 (againstAny, not)

export const containedIn = flip (contains)
export const containedInV = flip (containsV)
export const notContainedInV = compose2 (containedInV, not)


export const mapX = addIndex (map)

export const lookupOn = recurry (2) (
  o => k => o [k],
)
export const lookup = recurry (2) (
  k => o => lookupOn (o, k),
)
export const lookupOnOr = recurry (3) (
  (f) => (o) => (k) => lookupOn (o, k) | ifUndefined (f, id),
)
export const lookupOr = recurry (3) (
  (f) => (k) => (o) => lookupOnOr (f, o, k),
)
export const lookupOnOrV = recurry (3) (
  (x) => lookupOnOr (x | always),
)
export const lookupOrV = recurry (3) (
  (x) => lookupOr (x | always),
)
export const lookupOrDie = recurry (3) (
  (msg) => (k) => (o) => lookupOnOr (
    () => die (msg),
    o, k,
  )
)
export const lookupOnOrDie = recurry (3) (
  (msg) => (o) => (k) => lookupOrDie (msg, k, o),
)

/* Basically `each` with the arguments reversed. Useful for when you have a value and want to
 * apply several functions to it, but don't want to compose the functions.
 * You can also use `pam` for this (reverse map), but this makes it explicit that we're performing
 * (side-)effects and don't care about the return values of the functions.
 * (As a special case it returns the return value of the last one in case that's useful, but this
 * may change).
 */

export const effects = recurry (2) (
  (fs) => (x) => {
    let last
    for (const f of fs)
      last = f (x)
    return last
  }
)

export const elementAt = prop
