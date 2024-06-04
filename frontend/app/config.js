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
import iconCategories from './images/icons/categorieen.svg'
import iconDoel from './images/icons/doel.svg'
import iconDoelgroep from './images/icons/doelgroep.svg'
import iconFacebook from './images/icons/facebook-wit.svg'
import iconFilter from './images/icons/filter.svg'
import iconI from './images/icons/i-tje-blue.svg'
import iconInstagram from './images/icons/instagram-wit.svg'
import iconLinkedin from './images/icons/linkedin-wit.svg'
import iconLogin from './images/icons/login.svg'
import iconLogout from './images/icons/logout.svg'
import iconMore from './images/icons/more-grey.svg'
import iconRemove from './images/icons/trash.svg'
import iconSearch from './images/icons/search.svg'
import iconShowPasswordHidden from './images/icons/show-password-hidden.svg'
import iconShowPasswordShown from './images/icons/show-password-shown.svg'
import iconUpdate from './images/icons/update.svg'
import iconUser from './images/icons/user.svg'
import iconX from './images/icons/x-je-blue.svg'
import iconXTwitter from './images/icons/x-twitter-wit.svg'
import iconWerkRegio from './images/icons/werkregio.svg'
import imageEyeWall from './images/eye-wall-painting.jpg'
import imageLogoAUP from './images/logo-aup.svg'
import imageLogoFB from './images/logo-fb.svg'
import imageHeroFB from './images/hero-fb.svg'
import imageTest from './images/fonds/output_row_259.png'

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
    facebook: iconFacebook,
    filter: iconFilter,
    i: iconI,
    instagram: iconInstagram,
    linkedin: iconLinkedin,
    login: iconLogin,
    logout: iconLogout,
    more: iconMore,
    remove: iconRemove,
    search: iconSearch,
    'show-password-hidden': iconShowPasswordHidden,
    'show-password-shown': iconShowPasswordShown,
    user: iconUser,
    update: iconUpdate,
    xtwitter: iconXTwitter,
    x: iconX,
    result: {
      doel: iconDoel,
      doelgroep: iconDoelgroep,
      categories: iconCategories,
      werkRegio: iconWerkRegio,
    }
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
    'hero-fb': imageHeroFB,
    // 'hero-e': imageHeroE,
    // 'hero-text': imageHeroText,
  },
  imagesFonds: {
    test: imageTest,
  },
  colors: {
    header: {
      color1: '#EEEEEE',
      color2: '#FFBBBB',
    },
    // highlight: '#cb0233',
    highlight: '#164856',
    // highlightAlpha: '#cb0233ff',
    highlightAlpha: '#164856',
    highlight2: '#fff5e6',
    highlight3: '#761b07',
    // textBlock1: '#f9e9d7',
    // textBlock2: '#a1142d',
    // textBlock3: '#e74b67',
    textBlock1: 'white',
    textBlock1Fg: '#164856',
    textBlock2: 'white',
    textBlock3: 'white',
    textBlock4: 'white',
    textBlock5: 'white',
    textBlock6: 'white',
    textBlock7: 'white',
    textBlock8: 'white',
    textBlock9: 'white',
    textBlock10: 'white',
  },
  links: {
    aup: 'https://aup.nl',
    contactAUP: "https://www.aup.nl/nl/about/contact",
    artikelenAUP: "https://www.aup.nl/nl/articles",
    overOnsAUP: "https://aup.nl/nl/about",
    privacybeleidAUP: "https://www.aup.nl/nl/about/privacy-policy",
    vacaturesAUP: "https://www.aup.nl/nl/about/vacancies",
    toegangEnAbonnementen: "https://www.aup-online.com/how-to-subscribe",
    tijdschriften: "https://www.aup-online.com/content/publications",
    collecties: "ihttps://www.aup-online.com/content/collections",
    boeken: "https://www.aup.nl/en/academic",
    textboeken: "https://www.aup.nl/en/educational",
    facebookAUP: 'https://www.facebook.com/aupacademic/',
    instagramAUP: 'https://www.instagram.com/amsterdamuniversitypress/',
    linkedinAUP: 'https://www.linkedin.com/company/amsterdam-university-press/',
    xtwitterAUP: 'https://twitter.com/amsterdamupress',
    abonneeWordenAUP: "https://aboland.nl/bladen/kennis-en-wetenschap/onlinefondsenboek/",
    // @todo url might change in the future?
    nieuwsbriefAUP: "https://aup.us5.list-manage.com/subscribe?u=ae618e98510c18013898e0ee3&id=50ef6b34aa",
    dikkeblauwe: "https://www.aup-online.com/content/periodicals/26664186",
  },
  emailLinks: {
    // @todo use encodeURIComponent?
    meldFondsAan: "mailto:fondsen@aup.nl?subject=Fonds%20aanmelden",
    aanmerkingen: "mailto:fondsen@aup.nl?subject=Suggestie",
  }
}
