import {
  pipe, compose, composeRight,
  map, spreadTo, lets, flip, invoke, addIndex, not, eq,
  sprintf1, sprintfN, id, T, recurry, reduceRight, reduce, isString,
  ifOk, ifNil, always, die, tryCatch, assocM, ifPredicate,
  ifPredicateResults, whenPredicateResults,
  againstAll, gt, gte, dot1, join, repeatF,
  whenPredicate, list, ifNo, tap, ok, noop,
} from 'stick-js/es'

import path from 'node:path'
import { fileURLToPath, } from 'node:url'
import util from 'node:util'

import { recover, rejectP, then, } from 'alleycat-js/es/async'
import { flatMap, fold, foldMaybe, isLeft, Left, Right, } from 'alleycat-js/es/bilby'
import { composeManyRight, decorateRejection, setTimeoutOn, } from 'alleycat-js/es/general'
import { ifArray, ifUndefined, } from 'alleycat-js/es/predicate'

import { brightRed, error, } from './io.mjs'

// --- usage: `__dirname (import.meta.url)`
export const __dirname = fileURLToPath >> path.dirname

export const base64decode = (x) => Buffer.from (x, 'base64').toString ('ascii')
export const base64decodeAsBuffer = (x) => Buffer.from (x, 'base64')
export const base64encode = (x) => Buffer.from (x).toString ('base64')

export const ifNot = recurry (3) (
  (x) => (yes) => (no) => x | ifNo (yes, no),
)

// --- @future generic monad
// --- this feeds the unwrapped value to the next function in the chain --
// note that it does not accumulate the values like the `lets`-style
// functions.
export const doEither = (...eithers) => lets (
  () => eithers | map (flatMap) | spreadTo (composeManyRight),
  (chain) => Right (null) | chain,
)

// --- `config` may be null, in which case `configKey` is ignored
export const _envOrConfig = (required) => (config, configKey, envKey, validate=[null, T]) => {
  const [val, configOrEnvString] = lets (
    () => process.env [envKey],
    (fromEnv) => config | ifOk (
      () => {
        return config.get (configKey)
        | foldMaybe (id, () => fromEnv)
        | ifOk (
          (val) => [val, 'Config/environment'],
          () => ifNot (required) (
            () => [void 8, 'Config/environment'],
            () => error (
              [brightRed (envKey), brightRed (configKey)] | sprintfN ('Need environment variable %s or config value %s'),
            ),
          ),
        )
      },
      () => fromEnv | ifOk (
        (val) => [val, 'Environment'],
        () => ifNot (required) (
          () => [void 8, 'Environment'],
          () => error (
            [brightRed (envKey)] | sprintfN ('Missing environment variable %s'),
          ),
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

export const envOrConfig = _envOrConfig (true)
export const env = (key, validate) => _envOrConfig (true) (null, null, key, validate)
export const envOptional = (key, validate) => _envOrConfig (false) (null, null, key, validate)

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

export const inspectN = recurry (2) (
  (depth) => (x) => util.inspect (x, { depth, colors: process.stdout.isTTY, }),
)
export const inspect = inspectN (null)

// --- @todo stick
export const eachP = recurry (2) (
  (f) => async (xs) => {
    for (const x of xs)
      await f (x)
  }
)

export const mapX = addIndex (map)

export const flatten = recurry (2) (
  (n) => (xs) => {
    let ys = xs
    n | repeatF (
      () => ys = ys | flatMap (id),
    )
    return ys
  }
)

export const thenWhenPredicateResults = recurry (3) (
  (pred) => (f) => (promise) => {
    const res = pred ()
    return promise | then (
      (ret) => res ? f ([res, ret]) : ret,
    )
  },
)

export const thenWhen = recurry (3) (
  (p) => (f) => then (p () ? f : id),
)

export const thenWhenTrue = recurry (3) (
  (x) => thenWhen (() => x === true)
)

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

export const reverse = /*#__PURE__*/ xs => xs | reduceRight ((x, acc) => (acc.push (x), acc), [])

// --- see kattenluik for explanation (it's called `traverseEither` there)
export const traverseListEither = recurry (2) (
  (f) => (xs) => {
    const ret = []
    for (const x of xs) {
      const fx = f (x)
      if (fx.isLeft) return fx
      const [val] = fx.toArray ()
      ret.push (val)
    }
    return Right (ret)
  }
)

export const defined = x => x !== void 8

export const pluckZ = recurry (4) (
  ([validate, msg]) => (keys) => (f) => (o) => {
    const vals = keys | reduce (
      (acc, key) => {
        const val = o [key]
        if (not (defined (val))) die ('pluckZ: missing value for key ' + key)
        if (not (validate (val))) die ('pluckZ: invalid value for key ' + key + ', ' + msg)
        return acc | assocM (key, val)
      },
      {},
    )
    return f (vals, o)
  }
)
export const pluckOkZ = pluckZ ([ok, 'must not be nil'])

export const pluck1Z = recurry (4) (
  (validate) => (key) => (f) => (o) => {
    const g = ([val], o) => f (val, o)
    return pluckZ (validate, [key], g, o)
  },
)
export const pluck1OkZ = pluck1Z ([ok, 'must not be nil'])

export const ifString = ifPredicate (isString)

export const epochMs = () => Date.now ()

export const ifEqualsZero = eq (0) | ifPredicate

// --- @todo put somewhere else / reuse ?
export const foldWhenLeft = p => whenPredicate (isLeft) (fold (p, noop))
