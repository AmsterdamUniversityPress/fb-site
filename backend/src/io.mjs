import {
  pipe, compose, composeRight,
  tap, join, die, bindProp, invoke,
  condS, otherwise, eq, lte, guard,
  ifOk, nil, whenPredicate, sprintf1,
} from 'stick-js/es'

import fs from 'fs'

import fishLib from 'fish-lib'
const {
  log, green, magenta, brightRed, red, blue, yellow, cyan, underline,
  ierror, iwarn, forceColors, disableColors, sysSpawn,
} = fishLib

import { then, recover, } from 'alleycat-js/es/async'
import { toString, decorateRejection, } from 'alleycat-js/es/general'

export { log, ierror, iwarn, green, magenta, blue, cyan, red, yellow, brightRed, underline, sysSpawn, }

fishLib
  .sysSet ({ die: true, verbose: true, sync: true, })
  .bulletSet ({ type: 'parallel-lines' })

const whenLte = lte >> whenPredicate

let level = 2
let secretLevel = 0

const setLevel = (theLevel) => level = theLevel
const setSecretLevel = (theLevel) => secretLevel = theLevel
const speak = (theLevel, f) => (...args) => {
  if (level >= theLevel) f (...args)
}
const _debug = (...args) => log (
  [yellow ('.'), blue ('.'), yellow ('.')] | join (''),
  ...args,
)

export const setLevelError = () => 0 | setLevel
export const setLevelWarn  = () => 1 | setLevel
export const setLevelInfo  = () => 2 | setLevel
export const setLevelDebug = () => 3 | setLevel
export const setLevelTrace = () => 4 | setLevel

export const setSecretLevelOff  = () => 0 | setSecretLevel
export const setSecretLevelOn   = () => 1 | setSecretLevel
export const setSecretLevelMore = () => 2 | setSecretLevel

// --- note that the error functions are all considered fatal and cause the
// program to halt.

export const errorPlain = speak (0, fishLib.error)
export const warnPlain  = speak (1, fishLib.warn)
export const infoPlain  = speak (2, fishLib.info)
export const debugPlain = speak (3, _debug)

export const writeStdout = process.stdout | bindProp ('write')

const speakIt = (f, dateColor) => (...args) => f (new Date ().toISOString () | dateColor, ...args)
const speakWith = (f) => (header) => (...args) => f (... [header, ...args])

export const info = speakIt (infoPlain, underline)
export const infoWith = speakWith (info)
export const debug = speakIt (debugPlain, blue)
export const debugWith = speakWith (debug)
export const warn = speakIt (warnPlain, brightRed)
export const error = speakIt (errorPlain, red)

const _infoSecret = (theLevel, ...args) => theLevel | whenLte (secretLevel) (
  () => info (...args),
)

export const infoSecret = (...args) => _infoSecret (1, brightRed ('[secrecy 1]'), ...args)
export const infoSecretMore = (...args) => _infoSecret (2, underline (red ('[secrecy 2]')), ... args)

// --- no date, just for internal use.
export const logWith = speakWith (log)

/* Takes an exception, prints it as a (string) error message, and exits. In debug mode it also
 * prints the full exception with stack trace.
 */

// :: Error -> IO ()
export const errorX = tap (debugWith ('Full exception:')) >> toString >> error

/* Like `errorX`, but call warn/info instead of exiting with error.
 */

// :: Error -> IO ()
export const warnX = tap (debugWith ('Full exception:')) >> toString >> warn
export const infoX = tap (debugWith ('Full exception:')) >> toString >> info

export const mkdir = (dir) => sysSpawn (
  'mkdir', ['-p', dir],
  {
    sync: true,
    die: true,
  },
)

export const mkdirIfNeeded = (dir) => fs.existsSync (dir) || mkdir (dir)

export const init = (forceColorsOpt, disableColorsOpt, secretOpt) => {
  if (forceColorsOpt) forceColors ()
  else if (disableColorsOpt) disableColors ()

  invoke (secretOpt | condS ([
    0 | eq | guard (() => setSecretLevelOff),
    1 | eq | guard (() => setSecretLevelOn),
    2 | eq | guard (() => setSecretLevelMore),
    otherwise | guard (() => error ('invalid value for -s')),
  ]))
}
