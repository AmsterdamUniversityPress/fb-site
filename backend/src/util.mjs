import {
  pipe, compose, composeRight,
  map, spreadTo, lets,
  sprintf1, sprintfN, id, T, nil, recurry,
  ifOk, always, die,
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
