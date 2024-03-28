import {
  pipe, compose, composeRight,
  concatTo, lt, bindProp, noop, die,
  bindTryProp, defaultTo, lets, invoke, ifOk, id, not,
  T, F, prop, condS, gt, guard, sprintf1, arg0, divideBy, reduce,
  tap, otherwise, recurry, concat, side2, remapTuples, mergeToM,
  againstAny, contains, containsV, flip,
  map, addIndex, ifTrue,
} from 'stick-js/es'

// --- for spinner
import React from 'react'

import { Bounce as ToastBounce, toast, } from 'react-toastify'
import { call as sagaCall, all as sagaAll, put as sagaPut, } from 'redux-saga/effects'
const sagaEffects = {
  call: sagaCall,
  all: sagaAll,
  put: sagaPut,
}

import { cata, fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { keyPressListen, } from 'alleycat-js/es/dom'
import { doApiCall as _doApiCall, requestCompleteFold, } from 'alleycat-js/es/fetch'
import { getQueryParams, } from 'alleycat-js/es/general'
import { all, allV, isEmptyString, isEmptyList, whenEquals, } from 'alleycat-js/es/predicate'
import { componentTell, containerTell, useWhyTell, } from 'alleycat-js/es/react'
import { reducerTell, } from 'alleycat-js/es/redux'
import { saga as _saga, } from 'alleycat-js/es/saga'
import { initSelectorsTell, } from 'alleycat-js/es/select'
import { mediaRule, mgt, mlt, } from 'alleycat-js/es/styled'

import { spinner, } from './alleycat-components'
import config from './config'
import { envIsDev, } from './env'

const configTop = config | configure.init

export const log = console | bindProp ('log')
export const debug = console | bindTryProp ('debug') | defaultTo (() => log)

export const debugIt = (...args) => debug ('[debug] *', ...args)
export const debugDev = envIsDev ? debugIt : noop
export const debugDevWith = header => (...args) => debugDev (... [header, ...args])

; `
These are based on the Bootstrap 4 breakpoints.

Note that these are from the given width *and up*; in other words, mediaTablet is tablets and all
desktops, etc.

We generally need mediaPhone, mediaTablet, and mediaDesktop.
`

const alwaysMobile = configTop.get ('general.alwaysMobile')

export const mediaPhoneWidth      = 0
export const mediaPhoneBigWidth   = 576
export const mediaTabletWidth     = 768
export const mediaDesktopWidth    = 992
export const mediaDesktopBigWidth = 1200

const [mediaRulePhone, mediaRuleTablet, mediaRuleDesktop, mediaRuleDesktopBig, mediaRulePhoneOnly] = lets (
  () => [mgt (0), mlt (0)],
  ([always, never]) => alwaysMobile | ifTrue (
	() => [always, never, never, never, always],
	() => [mgt (0), mgt (801), mgt (992), mgt (1200), mlt (801)],
  ),
)

export const mediaPhone      = mediaRulePhone      | mediaRule
export const mediaTablet     = mediaRuleTablet     | mediaRule
export const mediaDesktop    = mediaRuleDesktop    | mediaRule
export const mediaDesktopBig = mediaRuleDesktopBig | mediaRule
export const mediaPhoneOnly  = mediaRulePhoneOnly  | mediaRule
export const isMobileWidth = 992 | lt

// --- note, user agent tests are never totally reliable.
// --- see mdn docs for a pretty good break-down.

export const isSafari = () => lets (
  () => window.navigator.userAgent,
  (ua) => allV (
    ua.indexOf ('Safari') !== -1,
    ua.indexOf ('Chrome') === -1,
    ua.indexOf ('Chromium') === -1,
  ),
)

/* Momentum scroll seems to be causing problems (flickering, bouncing weird & possibly causing other
 * problems).
 * Seen on iPhone 5 (iOS11 / 605) and iPhone SE.
 * For now, disabling on all (mobile) Safaris.
 */
export const shouldDisableMomentumScroll = invoke (() => {
  const cutoff = Infinity

  const q = getQueryParams ()
  if (q.momentum === '1') return F

  return () => lets (
    () => window.navigator.userAgent,
    (ua) => all (
      () => isSafari (),
      () => ua.match (/AppleWebKit\/(\d+)/),
      (_, m) => m | prop (1) | Number | lt (cutoff),
    ),
  )
})

export const prettyBytes = invoke (() => {
  const row = recurry (4) (
    fmt => pred => n => suffix =>
      Math.pow (1024, n + 1) | pred | guard (
        arg0 >> divideBy (Math.pow (1024, n)) >> sprintf1 (fmt) >> concat (' ' + suffix)
      )
  )

  return numDecimals => lets (
    _ => numDecimals | sprintf1 ('%%.%sf'),
    (fmt) => row (fmt),
    (_, rowFmt) => condS ([
      rowFmt (lt, 0, 'b'),
      rowFmt (lt, 1, 'k'),
      rowFmt (lt, 2, 'M'),
      rowFmt (_ => T, 3, 'G'),
    ]),
  )
})

export const checkUploadFilesSize = ({
  file,
  maxFileSize: max = 1024 * 1024,
  prettyBytesDecimalPlaces: places = 0,
  alertFunc = noop,
}) => file.size | condS ([
  max | gt | guard (_ => max
    | prettyBytes (places)
    | sprintf1 ('File too large! (max = %s)')
    | tap (alertFunc)
    | F
  ),
  otherwise | guard (T),
])

export const makeFormData = invoke (() => {
  const app = side2 ('append')
  return (data) => data
    | remapTuples (app)
    | reduce (pipe, new FormData ())
})

export const useWhy = 'debug.render' | configTop.get | useWhyTell

// const debug  = (...args) => console.debug (...args)

export const component = 'debug.render' | configTop.get | componentTell
export const container = 'debug.render' | configTop.get | containerTell

export const reducer = 'debug.reducers' | configTop.get | reducerTell
export const initSelectors = 'debug.selectors' | configTop.get | initSelectorsTell

const toastXOptions = recurry (3) (
  // --- msg can be nil (for example if there's a user error with no umsg), in which case the toast won't show at all.
  (f) => (opts) => (msg) => lets (
    () => msg ?? 'Oops! Something went wrong',
    (msg_) => toast [f] (msg_, opts | mergeToM ({
      transition: ToastBounce,
      autoClose: 5000,
      closeOnClick: true,
    })),
  ),
)

export const toastErrorOptions = toastXOptions ('error')
export const toastWarnOptions = toastXOptions ('warn')
export const toastSuccessOptions = toastXOptions ('success')
export const toastInfoOptions = toastXOptions ('info')

export const toastError = toastErrorOptions ({})
export const toastWarn = toastWarnOptions ({})
export const toastSuccess = toastSuccessOptions ({})
export const toastInfo = toastInfoOptions ({ autoClose: 20000, })

export function saga (...args) {
  return _saga (sagaEffects, ...args)
}

export function *doApiCall (...args) {
  yield sagaCall (_doApiCall, sagaEffects, ...args)
}

export const requestResults = ({
  Spinner=spinner ('comet'),
  spinnerProps={},
  onError=ifOk (
    String >> concatTo ('Error: '),
    () => 'Error',
  ),
  onResults=id,
  onLoading=() => <Spinner {... spinnerProps}/>,
} = {}) => cata ({
  RequestInit: () => null,
  RequestLoading: (_) => onLoading (),
  RequestError: (err) => err | onError,
  RequestResults: (res) => res | onResults,
})

// :: (a -> b) -> Request a -> b | undefined
export const foldWhenRequestResults = (f) => cata ({
  RequestInit: () => void 8,
  RequestLoading: () => void 8,
  RequestError: () => void 8,
  RequestResults: (res) => f (res),
})

// :: (a -> b) -> Request a -> b | undefined
export const toRequestResults = cata ({
  RequestInit: () => die ('toRequestResults (): got RequestInit'),
  RequestLoading: () => die ('toRequestResults (): got RequestLoading'),
  RequestError: () => die ('toRequestResults (): got RequestError'),
  RequestResults: (res) => res,
})

// :: (a -> b) -> Maybe a -> b | undefined
export const foldWhenJust = recurry (2) (
  (f) => (mb) => mb | fold (f, void 8),
)

export const isNotEmptyString = not << isEmptyString
export const isNotEmptyList = not << isEmptyList

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

// --- @todo alleycat-js
/* Usage:
 *   onKeyDown={keyDownListen (onSubmit, 'Enter')}
 */

export const keyDownListen = keyPressListen

export const mapX = addIndex (map)

export const whenRequestCompleteSuccess = recurry (2) (
  (f) => (rcomplete) => rcomplete | requestCompleteFold (
    f, noop, noop,
  ),
)
