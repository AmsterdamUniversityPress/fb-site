import {
  pipe, compose, composeRight,
  addIndex2,
  concatTo, lt, bindProp, noop, die, always,
  bindTryProp, defaultTo, lets, invoke, ifOk, id, not,
  T, F, prop, condS, gt, guard, sprintf1, arg0, divideBy, reduce,
  tap, otherwise, recurry, concat, side2, remapTuples, mergeToM,
  againstAny, contains, containsV, flip,
  map, addIndex, ifTrue, ifPredicate, whenPredicate,
  dot2, dot1, repeatF,
  mergeInM,
} from 'stick-js/es'

import { fold, Right, Left, flatMap, } from 'alleycat-js/es/bilby'
import {
  doApiCall as _doApiCall, requestCompleteFold,
  RequestInit, RequestLoading, RequestError, RequestResults,
} from 'alleycat-js/es/fetch'
import { length, getQueryParams, } from 'alleycat-js/es/general'
import { all, allV, ifUndefined, isEmptyString, isEmptyList, ifFalseV, whenEquals, } from 'alleycat-js/es/predicate'
import { componentTell, containerTell, useWhyTell, } from 'alleycat-js/es/react'
import { reducerTell, } from 'alleycat-js/es/redux'
import { saga as _saga, } from 'alleycat-js/es/saga'
import { initSelectorsTell, } from 'alleycat-js/es/select'
import { mediaRule, mgt, mlt, } from 'alleycat-js/es/styled'


const slice = dot2 ('slice')

// :: (a -> b) -> Maybe a -> b | undefined
export const foldWhenJust = recurry (2) (
  (f) => (mb) => mb | fold (f, void 8),
)

export const isNotEmptyString = not << isEmptyString
export const isNotEmptyList = not << isEmptyList
export const whenIsNotEmptyString = isNotEmptyString | whenPredicate
export const whenIsNotEmptyList = isNotEmptyList | whenPredicate
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

export const mapLookupOn = recurry (2) (
  (o) => (k) => o.get (k),
)
export const mapLookup = recurry (2) (
  (k) => (o) => mapLookupOn (o, k),
)
export const mapLookupEitherOnWith = recurry (3) (
  msg => o => k => mapLookupOn (o, k) | ifOk (
    Right, () => Left (msg),
  ),
)
export const mapLookupEitherOn = recurry (2) (
  o => k => mapLookupEitherOnWith (
    "Can't find key " + String (k),
  ) (o, k),
)
export const mapLookupOnOr = recurry (3) (
  (f) => (o) => (k) => mapLookupOn (o, k) | ifUndefined (f, id),
)
export const mapLookupOr = recurry (3) (
  (f) => (k) => (o) => mapLookupOnOr (f, o, k),
)
export const mapLookupOnOrV = recurry (3) (
  (x) => mapLookupOnOr (x | always),
)
export const mapLookupOrV = recurry (3) (
  (x) => mapLookupOr (x | always),
)
export const mapLookupOrDie = recurry (3) (
  (msg) => (k) => (o) => mapLookupOnOr (
    () => die (msg),
    o, k,
  )
)
export const mapLookupOnOrDie = recurry (3) (
  (msg) => (o) => (k) => mapLookupOrDie (msg, k, o),
)

export const truncate = recurry (2) (
  (n) => (s) => lets (
    () => length (s) > n,
    (doIt) => doIt | ifFalseV (id, slice (0, n) >> concat ('…')),
    (_, f) => f (s),
  ),
)

export const reduceX = addIndex2 (reduce)
const isEven = (n) => n % 2 === 0
export const ifEven = isEven | ifPredicate


export const mapGet = recurry (2) (
  (key) => (map) => map.get (key)
)

export const mapSetM = recurry (3) (
  (key) => (value) => (map) =>  map.set (key, value)
)

export const mapUpdateM = recurry (3) (
  (key) => (f) => (map) => map.set (
    key,
    f (map.get (key)))
)

export const mapClone = (map) => new Map ([... map])

export const mapUpdate = recurry (3) (
  (key) => (f) => (map) => (map | mapClone).set (
    key,
    f (map.get (key)),
  ),
)

export const setClone = (set) => new Set ([... set])
export const setToggle = recurry (2) (
  (val) => (set) => set | setClone | tap (
    (setc) => setc.has (val) ? setc.delete (val) : setc.add (val),
  ),
)
export const setAdd = recurry (2) (
  (val) => (set) => (set | setClone).add (val),
)

export const setRemove = recurry (2) (
  (val) => (set) => (set | setClone).delete (val),
)
export const setRemap = recurry (2) (
  (f) => (set) => {
    const ret = []
    for (const x of set.values ())
      ret.push (f (x))
    return ret
  },
)

// @todo some recurrying?
export const mapForEach = dot1 ('forEach')

export const mapMapTuples = recurry (2) (
  (f) => (m) => {
    const ret = new Map
    for (const [k, v] of m) {
      const [kk, vv] = f (k, v)
      ret.set (kk, vv)
    }
    return ret
  },
)

export const mapRemapTuples = recurry (2) (
  (f) => (m) => {
    const ret = []
    for (const [k, v] of m) {
      ret.push (f (k, v))
    }
    return ret
  },
)

// --- note that this is slightly different from JS's own Array.prototype.flatMap: `f` must return
// list, which the native one also allows primitive values.

export const mapFlatRemapTuples = recurry (2) (
  (f) => (m) => {
    const ret = []
    for (const [k, v] of m) {
      ret.push (... f (k, v))
    }
    return ret
  },
)

export const mapTake = recurry (2) (
  (n) => (m) => {
    const ret = new Map
    let i = 0
    for (const [k, v] of m) {
      ret.set (k, v)
      if ((i += 1) >= n) break
    }
    return ret
  }
)

export const mapFilterKeys = recurry (2) (
  (f) => (m) => {
    const ret = new Map
    for (const [k, v] of m)
      if (f (k)) ret.set (k, v)
    return ret
  }
)

export const flatten = recurry (2) (
  (n) => (xs) => {
    let ys = xs
    n | repeatF (
      () => ys = ys | flatMap (id),
    )
    return ys
  }
)

// --- @todo made the same way as `assoc` in stick, with the same caveat about
// arrays being converted to objects (see source of `assoc` in stick)

export const remove = recurry (2) (
  (prop) => (o) => {
    const oo = mergeInM (o) (Object.create (null))
    delete oo [prop]
    return oo
  },
)
