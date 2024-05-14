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
import imageLogoHelvetica from './images/fb-logo-helvetica.svg'
import imageBackground from './images/background.jpg'
import imageUitgave from './images/uitgave.svg'

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
    background: imageBackground,
    fonds: imageEyeWall,
    logo: imageLogoHelvetica,
    uitgave: imageUitgave,
  },
  colors: {
    header: {
      color1: '#EEEEEE',
      color2: '#FFBBBB',
    },
    highlight: '#ffdbdb',
    highlightAlpha: '#ffdbdbdd',
    highlight2: '#ffc4c4',
    highlight2Alpha: '#ffc4c4dd',
    highlight3: '#fff88c',
    highlight3Alpha: '#fff88cdd',
    highlight4: '#efefff',
    highlight4Alpha: '#efefffdd',
  },
}
