import {
  pipe, compose, composeRight,
  join, take, id, lets,
  tap,
} from 'stick-js/es'

import { fontFace, cssFont, } from 'alleycat-js/es/font'
import { logWith, } from 'alleycat-js/es/general'

import { envIsDev, envIsTst, envIsNotPrd, } from './env'

import iconLogout from './images/icons/logout.svg'
import iconShowPasswordHidden from './images/icons/show-password-hidden.svg'
import iconShowPasswordShown from './images/icons/show-password-shown.svg'
import iconUser from './images/icons/user.svg'

// const debugRenders = envIsDev
// const debugReducers = envIsDev
// const debugSelectors = envIsDev
const debugRenders = false
const debugReducers = false
const debugSelectors = false

const getMainFontCss = () => join ('\n\n', [
  fontFace (
    'Lora',
    [
      [
        require ('./fonts/lora.woff2'),
        'woff',
      ],
    ],
    {
      weight: 'normal',
      style: 'normal',
      stretch: 'normal',
    },
  ),
])

export default {
  debug: {
    render: debugRenders && {
      Main: true,
    },
    reducers: debugReducers && {
      // domain: true,
      app: true,
    },
    selectors: debugSelectors && {
      domain: {
        counter: true,
        error: true,
        countedSeven: true,
      },
    },
  },
  general: {
    helloInterval: 4000,
  },
  font: {
    main: {
      css: getMainFontCss (),
      family: 'Lora',
    },
  },
  icons: {
    'logout': iconLogout,
    'show-password-hidden': iconShowPasswordHidden,
    'show-password-shown': iconShowPasswordShown,
    'user': iconUser,
  },
  images: {
  },
  colors: {
    header: {
      color1: '#EEEEEE',
      color2: '#FFBBBB',
    }
  },
}
