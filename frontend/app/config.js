import {
  pipe, compose, composeRight,
  join, sprintfN, tap, whenOk, lets, compact,
} from 'stick-js/es'

import { fontFace, cssFont, } from 'alleycat-js/es/font'
import { iwarn, } from 'alleycat-js/es/general'
import { logWith, } from 'alleycat-js/es/general'

import { mapLookupOnOr, } from './util-general'

import iconAdd from './images/icons/plus.svg'
import iconAdmin from './images/icons/admin.svg'
import iconArrow from './images/icons/arrow.svg'
import iconCategories from './images/icons/category.svg.js'
import iconDoel from './images/icons/doelstelling.svg.js'
import iconDoelgroep from './images/icons/doelgroep.svg.js'
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
import iconWerkRegio from './images/icons/werkregio.svg.js'
import imageEyeWall from './images/eye-wall-painting.jpg'
import imageLogoAUP from './images/logo-aup.svg'
import imageLogoFB from './images/logo-fb.svg'
import imageHeroFB from './images/hero-fb.svg'
import imagesFondsMapping from './config-fonds-images'

const debugRenders = false
const debugReducers = false
const debugSelectors = false

const getMainFontCss = () => join ('\n\n', [
  fontFace (
    'Montserrat Regular',
    [
      [
        require ('./fonts/Montserrat-Regular.woff2'),
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

const emailLink = (to, subject=null) => lets (
  () => 'mailto:' + to,
  () => subject | whenOk ((s) => 'subject=' + encodeURIComponent (s)),
  (to_, sub_) => join ('?', compact ([to_, sub_])),
)

const config = {
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
      family: 'Montserrat Regular',
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
      category: iconCategories,
      werkRegio: iconWerkRegio,
    }
  },
  text: {
    filterLabels: {
      categories: 'Categorieën',
      trefwoorden: 'Trefwoorden',
      naam_organisatie: 'Fondsnaam',
      werkterreinen_geografisch: `Regio's`,
    },
  },
  images: {
    fondsPlaceholder: imageEyeWall,
    'logo-fb': imageLogoFB,
    'logo-aup': imageLogoAUP,
    'hero-fb': imageHeroFB,
  },
  imagesFonds: {
    mapping: imagesFondsMapping,
  },
  colors: {
    header: {
      color1: '#EEEEEE',
      color2: '#FFBBBB',
    },
    highlight: '#164856',
    highlightAlpha: '#164856',
    highlight2: '#fdc600',
    highlight3: '#761b07',
    textBlock3: '#e74b67',
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
    // @todo url might change in the future?
    nieuwsbriefAUP: "https://aup.us5.list-manage.com/subscribe?u=ae618e98510c18013898e0ee3&id=50ef6b34aa",
    dikkeblauwe: "https://www.aup-online.com/content/periodicals/26664186",
  },
  emailLinks: {
    meldFondsAan: emailLink ('fondsen@aup.nl', 'Fonds aanmelden'),
    aanmerkingen: emailLink ('fondsen@aup.nl', 'Suggestie'),
    abonneeWordenAUP: emailLink ('support@aup.nl', 'abonnement Fondsenboek online'),
  },
}

export const getFondsImage = (imgId) => imgId | mapLookupOnOr (
  () => {
    iwarn ([imgId] | sprintfN ('Unable to find image for %s, using fallback'))
    return imageHeroFB
  },
  imagesFondsMapping,
)

export default config
