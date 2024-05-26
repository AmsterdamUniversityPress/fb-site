import {
  pipe, compose, composeRight,
  join, take, id, lets,
  tap,
} from 'stick-js/es'

import { fontFace, cssFont, } from 'alleycat-js/es/font'
import { logWith, } from 'alleycat-js/es/general'

import { envIsDev, envIsTst, envIsNotPrd, } from './env'

import iconAdd from './images/icons/plus.svg'
import iconAdmin from './images/icons/admin.svg'
import iconArrow from './images/icons/arrow.svg'
import iconFilter from './images/icons/filter.svg'
import iconLogin from './images/icons/login.svg'
import iconLogout from './images/icons/logout.svg'
import iconMore from './images/icons/more-grey.svg'
import iconRemove from './images/icons/trash.svg'
import iconSearch from './images/icons/search.svg'
import iconShowPasswordHidden from './images/icons/show-password-hidden.svg'
import iconShowPasswordShown from './images/icons/show-password-shown.svg'
import iconUpdate from './images/icons/update.svg'
import iconUser from './images/icons/user.svg'
import imageEyeWall from './images/eye-wall-painting.jpg'
import imageLogoAUP from './images/logo-aup.svg'
import imageLogoFB from './images/logo-fb.svg'
import imageHeroE from './images/hero-e.png'
import imageHeroText from './images/hero-text.svg'

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
  app: {
    keys: {
      Pagination: {
        fonds: 'FondsenPagination',
        search: 'SearchPagination',
      },
    },
    element: '#app',
  },
  debug: {
    render: debugRenders && {
      Main: true,
    },
    reducers: debugReducers && {
      // domain: true,
      app: true,
      Search: true,
    },
    selectors: debugSelectors && {
      domain: {
        error: true,
      },
      Pagination: true,
      Search: true,
    },
  },
  general: {
    // --- for selecting everything other than the modal dialog
    appWrapperSelector: '[class*=AppWrapper]',
    alwaysMobile: false,
    helloInterval: 60000,
    // --- note, these must match settings in the backend for this to make sense
    minimumPasswordScore: 4,
    enforcePasswordStrength: true,
    // ---
  },
  font: {
    main: {
      css: getMainFontCss (),
      family: 'Lora',
    },
  },
  icons: {
    add: iconAdd,
    admin: iconAdmin,
    arrow: iconArrow,
    filter: iconFilter,
    login: iconLogin,
    logout: iconLogout,
    more: iconMore,
    remove: iconRemove,
    search: iconSearch,
    'show-password-hidden': iconShowPasswordHidden,
    'show-password-shown': iconShowPasswordShown,
    user: iconUser,
    update: iconUpdate,
  },
  text: {
    filterLabels: {
      categories: 'Categorieën',
      trefwoorden: 'Trefwoorden',
      naam_organisatie: 'Fondsnaam',
      regios: `Regio's`,
    },
  },
  images: {
    fonds: imageEyeWall,
    'logo-fb': imageLogoFB,
    'logo-aup': imageLogoAUP,
    'hero-e': imageHeroE,
    'hero-text': imageHeroText,
  },
  colors: {
    header: {
      color1: '#EEEEEE',
      color2: '#FFBBBB',
    },
    highlight: '#cb0233',
    highlightAlpha: '#cb0233ff',
    highlight2: '#fff5e6',
    highlight3: '#761b07',
    textBlock1: '#f9e9d7',
    textBlock2: '#a1142d',
    textBlock3: '#e74b67',
  },
  links: {
    aup: 'https://aup.nl',
  },
}
