import {
  pipe, compose, composeRight,
  map, spreadTo, lets,
} from 'stick-js/es'

import path from 'path'
import { fileURLToPath, } from 'url'

import { flatMap, Right, } from 'alleycat-js/es/bilby'
import { composeManyRight, } from 'alleycat-js/es/general'

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
