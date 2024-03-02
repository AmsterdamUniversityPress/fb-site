import {
  pipe, compose, composeRight,
  map, spreadTo, lets,
  sprintf1, sprintfN, id, T, nil, recurry,
  ifOk, always, die,
  ifPredicateResults, whenPredicateResults,
} from 'stick-js/es'

import path from 'path'
import { fileURLToPath, } from 'url'

import { flatMap, Left, Right, } from 'alleycat-js/es/bilby'
import { composeManyRight, } from 'alleycat-js/es/general'
import { ifUndefined, } from 'alleycat-js/es/predicate'

import { brightRed, error, } from './io.mjs'

// --- usage: `__dirname (import.meta.url)`
export const __dirname = fileURLToPath >> path.dirname

export const base64decode = (x) => Buffer.from (x, 'base64').toString ('ascii')
export const base64decodeAsBuffer = (x) => Buffer.from (x, 'base64')
export const base64encode = (x) => Buffer.from (x).toString ('base64')

// --- @future generic monad
// --- this feeds the unwrapped value to the next function in the chain --
// note that it does not accumulate the values like the `lets`-style
// functions.
export const doEither = (...eithers) => lets (
  () => eithers | map (flatMap) | spreadTo (composeManyRight),
  (chain) => Right (null) | chain,
)

export const env = (key, validate=[null, T], f=id) => {
  const val = process.env [key]
  if (nil (val)) error (
    brightRed (key) | sprintf1 ('Missing environment variable %s'),
  )
  const [must, validateF] = validate
  if (!validateF (f (val))) error (
    [brightRed (key), must] | sprintfN ('Environment variable %s %s'),
  )
  return val
}

export const lookupOn = recurry (2) (
  o => k => o [k],
)
export const lookup = recurry (2) (
  k => o => lookupOn (o, k),
)

export const lookupEitherOn = recurry (2) (
  o => k => o [k] | ifOk (
    Right, () => Left ("Can't find key " + String (k)),
  ),
)

// --- @todo would be nicer to put f at the end.
// --- @todo versions which take yes/no functions.

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

const canEnum = (o, k) => Object.prototype.propertyIsEnumerable.call (o, k)

export const compose2 = (f, g) => recurry (2) (
  (a) => (b) => g (f (a, b)),
)

// --- @experimental
export const compose3 = (f, g) => recurry (3) (
  (a) => (b) => (c) => g (f (a, b, c)),
)

// --- @experimental
export const compose4 = (f, g) => recurry (4) (
  (a) => (b) => (c) => (d) => g (f (a, b, c, d)),
)

export const mapTuplesAsMap = (f) => (o) => {
  const ret = new Map ()
  for (const k of Reflect.ownKeys (o)) {
    if (!canEnum (o, k)) continue
    const [kk, vv] = f (k, o [k])
    ret.set (kk, vv)
  }
  return ret
}

// :: a -> Map a b -> b | undefined
export const mapHas = recurry (2) (
  (k) => (m) => m.has (k) ? m.get (k) : void 8,
)

// :: a -> (b -> c) -> Map a b -> c | undefined
// export const whenMapHas = compose3 (mapHas, whenPredicate)
export const whenMapHas = recurry (3) (
  mapHas >> whenPredicateResults,
)

// :: a -> ~yes:(b -> c) -> ~no:(b -> d) -> Map a b -> c | d
// export const ifMapHas = compose4 (mapHas, ifPredicate)
export const ifMapHas = recurry (4) (
  mapHas >> ifPredicateResults,
)

export const noopP = async () => {}
