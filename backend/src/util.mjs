import {
  pipe, compose, composeRight,
  map, spreadTo, lets,
  sprintf1, sprintfN, id, T, nil,
} from 'stick-js/es'

import path from 'path'
import { fileURLToPath, } from 'url'

import { flatMap, Right, } from 'alleycat-js/es/bilby'
import { composeManyRight, } from 'alleycat-js/es/general'

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
