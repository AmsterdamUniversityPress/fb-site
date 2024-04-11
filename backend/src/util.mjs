import {
  pipe, compose, composeRight,
  map, spreadTo, lets, flip, invoke,
  sprintf1, sprintfN, id, T, recurry,
  ifOk, ifNil, always, die, tryCatch,
  ifPredicateResults, whenPredicateResults,
  againstAll, gt, gte, dot1, join, repeatF,
  list,
} from 'stick-js/es'

import path from 'node:path'
import { fileURLToPath, } from 'node:url'
import util from 'node:util'

import { recover, rejectP, then, } from 'alleycat-js/es/async'
import { flatMap, foldMaybe, Left, Right, } from 'alleycat-js/es/bilby'
import { composeManyRight, decorateRejection, setTimeoutOn, } from 'alleycat-js/es/general'
import { ifArray, ifUndefined, } from 'alleycat-js/es/predicate'

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

// --- `config` may be null, in which case `configKey` is ignored
export const envOrConfig = (config, configKey, envKey, validate=[null, T]) => {
  const [val, configOrEnvString] = lets (
    () => process.env [envKey],
    (fromEnv) => config | ifOk (
      () => {
        return config.get (configKey)
        | foldMaybe (id, () => fromEnv)
        | ifOk (
          (val) => [val, 'Config/environment'],
          () => error (
            [brightRed (envKey), brightRed (configKey)] | sprintfN ('Need environment variable %s or config value %s'),
          ),
        )
      },
      () => fromEnv | ifOk (
        (val) => [val, 'Environment'],
        () => error (
          [brightRed (envKey)] | sprintfN ('Missing environment variable %s'),
        ),
      ),
    ),
  )
  const [mustString, validateF] = validate
  if (!validateF (val)) error (
    [configOrEnvString, brightRed (envKey), mustString] | sprintfN ('%s value %s %s'),
  )
  return val
}

export const env = (key, validate) => envOrConfig (null, null, key, validate)

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

// --- @future would be nicer to put f at the end.
// --- @future versions which take yes/no functions.

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

export const decorateAndRethrow = recurry (2) (
  (prefix) => (f) => tryCatch (
    id,
    (err) => die (err | decorateRejection (prefix)),
    f,
  ),
)

export const decorateAndReject = recurry (2) (
  (prefix) => rejectP << decorateRejection (prefix),
)

/* Returns true iff all elements of `n` are contained in `m`. Also true if
 * `n` is the empty set.
 */
export const isSubsetOf = recurry (2) (
  (m) => (n) => {
    for (const x of n.values ())
      if (!m.has (x))
        return false
    return true
  }
)

export const isSupersetOf = flip (isSubsetOf)

export const isInt = (n) => lets (
  () => Math.abs (n),
  (abs) => Math.floor (abs) === abs,
)
export const isNonNegativeInt = againstAll ([isInt, gte (0)])
export const isPositiveInt = againstAll ([isInt, gt (0)])

// --- on abort it returns the value passed to `abort`, which defaults to `true`
export const eachAbort = recurry (2) (
  (f) => (xs) => {
    let quit = false
    let _abortVal
    const abort = (abortVal=true) => {
      quit = true
      _abortVal = abortVal
    }
    for (const x of xs) {
      f (abort, x)
      if (quit) return _abortVal
    }
  }
)

// --- (Int, String) => String
export const generateRandomString = invoke (() => {
  const alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const integers = "0123456789"
  const exCharacters = "!@#$%^&*_-=+"
  const chars = alpha + integers + exCharacters
  return (length) => {
    const generateChar = () => lets (
      () => Math.floor (Math.random () * chars.length),
      (n) => chars | dot1 ('charAt') (n)
    )
    return repeatF (generateChar, length) | join ('')
  }
})

export const tryCatchP = recurry (3) (
  (onGood) => (onBad) => async (f) => {
    try {
      const ret = await f ()
      return onGood (ret)
    }
    catch (e) {
      return onBad (e)
    }
  }
)

// --- rejects with the last rejection message
export const retryP = recurry (3) (
  (onRejectAttempt) => (timing) => (f) => new Promise ((res, rej) => {
    const loop = (n) => {
      f (n)
      | then (res)
      | recover ((e) => {
        const timeout = timing (n)
        onRejectAttempt (e, n, timeout)
        timeout | ifOk (
          setTimeoutOn (() => loop (n+1)),
          () => rej (e),
        )
      })
    }
    loop (0)
  }),
)

export const retryPDefaultMessage = recurry (4) (
  (onRejectAttemptMsg) => (onRejectAttempt) => (timing) => (f) => retryP (
    (e, n, timeout) => lets (
      () => (n+1) | sprintf1 ('(attempt #%d)'),
      () => timeout | ifOk (
        sprintf1 ('retrying in %d milliseconds'),
        () => 'giving up',
      ),
      (attempt, cont) => onRejectAttempt (e | decorateRejection (
        [onRejectAttemptMsg, attempt + ',', cont + ': '] | join (' '),
      )),
    ),
    timing,
    f,
  ),
)

export const toListSingleton = ifArray (id, list)
export const toListCollapseNil = ifNil (() => [], toListSingleton)

export const inspect = x => util.inspect (x, { depth: null, colors: process.stdout.isTTY, })

// --- @todo stick
export const eachP = recurry (2) (
  (f) => async (xs) => {
    for (const x of xs)
      await f (x)
  }
)
