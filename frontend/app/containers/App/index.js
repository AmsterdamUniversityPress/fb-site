import {
  pipe, compose, composeRight,
  map, dot, dot1, die, sprintf1,
  prop, whenOk, ifFalse, ifTrue,
  eq, nil, not, whenTrue, tap,
} from 'stick-js/es'

import React, { useCallback, useEffect, useRef, useState, } from 'react'
import styled from 'styled-components'
import { createBrowserRouter, RouterProvider, } from 'react-router-dom'
import { useDispatch, useSelector, } from 'react-redux'

import FontFaceObserver from 'fontfaceobserver'

import { then, recover, allP, } from 'alleycat-js/es/async'
import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { logWith, iwarn, } from 'alleycat-js/es/general'
import { whenTrueV, } from 'alleycat-js/es/predicate'
import { useMeasureWithCb, useCallbackConst, } from 'alleycat-js/es/react'
import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import { selectAllowAnalytical, selectCookiesDecided, selectUserLoggedIn, } from './store/app/selectors'
import domainReducer from './store/domain/reducer'
import { selectError, } from './store/domain/selectors'
import uiReducer from './store/ui/reducer'
import appReducer from './store/app/reducer'

import { allowAnalyticalUpdate, appMounted, } from './actions/main'
import saga from './sagas/main'

import { ErrorBoundary, } from '../../components/ErrorBoundary'
import { Main, } from '../../containers/Main/Loadable'
import NotFoundPage from '../../containers/NotFoundPage'
import Toast from '../../components/Toast'

import { AlleyCatFooter, } from '../../alleycat-components'
import { Button, } from '../../components/shared'
import { container, container2, mediaPhone, mediaTablet, mediaDesktop, isMobileWidth, useWhy, } from '../../common'
import { notContainedInV, lookupOnOr, } from '../../util-general'
import config from '../../config'

const configTop = config | configure.init
const configColors = configTop.focus ('colors')
const configIcons = configTop.focus ('icons')
const configLinks = configTop.focus ('links')
const configEmailLinks = configTop.focus ('emailLinks')

const linkFacebookAUP = configLinks.get ('facebookAUP')
const linkInstagramAUP = configLinks.get ('instagramAUP')
const linkLinkedinAUP = configLinks.get ('linkedinAUP')
const linkXTwitterAUP = configLinks.get ('xtwitterAUP')

const linkNieuwsbriefAUP = configLinks.get ('nieuwsbriefAUP')

const linkDikkeBlauwe = configLinks.get ('dikkeblauwe')
const linkContactAUP = configLinks.get ('contactAUP')
const linkOverOnsAUP = configLinks.get ('overOnsAUP')
const linkArtikelenAUP = configLinks.get ('artikelenAUP')
const linkPrivacybeleidAUP = configLinks.get ('privacybeleidAUP')
const linkVacaturesAUP = configLinks.get ('vacaturesAUP')
const linkToegangEnAbonnementen = configLinks.get ('toegangEnAbonnementen')
const linkTijdschriften = configLinks.get ('tijdschriften')
const linkCollecties = configLinks.get ('collecties')
const linkBoeken = configLinks.get ('boeken')
const linkTextboeken = configLinks.get ('textboeken')

const emailLinkAbonneeWordenAUP = configEmailLinks.get ('abonneeWordenAUP')
const emailLinkAanmerkingen = configEmailLinks.get ('aanmerkingen')
const emailLinkMeldFondsAan = configEmailLinks.get ('meldFondsAan')

const imageIconFacebook = configIcons.get ('facebook')
const imageIconInstagram = configIcons.get ('instagram')
const imageIconLinkedin = configIcons.get ('linkedin')
const imageIconXTwitter = configIcons.get ('xtwitter')

const colors = configColors.gets (
  'highlight', 'highlightAlpha', 'highlight2',
)

const fontMainFamily = 'font.main.family' | configTop.get

const fontStyles = [
  ['normal', 'normal'],
  ['normal', 'italic'],
  ['bold', 'normal'],
  ['bold', 'italic'],
]

const loadFont = 'load' | dot

const startFontObserver = fontFamily => fontStyles | map (
    ([weight, style]) => new FontFaceObserver (fontFamily, {
      weight,
      style,
    }),
  )
  | map (loadFont)
  | allP
  // --- doesn't always die on failure @todo
  | recover ((fontDetails) => die (
    fontFamily | sprintf1 ('timed out waiting for font %s'),
    fontDetails | JSON.stringify,
  ))

const AppWrapper = styled.div`
  ${mediaQuery (
    mediaPhone ('font-size: 14px'),
    mediaTablet ('font-size: 12px'),
  )}
  &.x--dialog-open {
    filter: brightness(0.6) blur(3px);
  }
  // --- this is mysterious -- it's a hack which *might* help with scrolling/flickering issues on
  // iPhone5 Safari by forcing GPU.
  transform: translate3d(0, 0, 0);
  position: relative;
  overflow-x: hidden;
  margin: 0 auto;
  height: 100%;
  // font-family: Arial;

  > .x__main {
    position: relative;
    z-index: 3;
    min-height: 100vh;
    background: white;
  }
  > .x__footer {
    width: 100%;
    z-index: 2;
    // --- not sure why this is necessary
    margin-top: -16px;
  }
  > .x__cookies {
    position: sticky;
    // left: 50%;
    // transform: translateX(-50%);
    bottom: 0;

    width: 100%;
    // --- not sure why this is necessary
    margin-top: -12px;
    // z-index: 1;
    z-index: 4;
    // background: #ffeaea;
    padding-top: 50px;
    padding-bottom: 50px;
    display: flex;
    justify-content: flex-end;
    > * {
      flex: 0 1 580px;
    }
    ${mediaQuery (
      mediaPhone (`
      `),
      mediaTablet (`
        padding-right: 50px;
      `),
    )}
  }
  > .x__ac-footer {
    position: sticky;
    left: 0;
    bottom: 0px;
    width: 100%;
    z-index: 0;
    padding-top: 10px;
    padding-bottom: 10px;
  }
  ${mediaQuery (
    mediaPhone (`
      > .x__footer {
        position: relative;
      }
    `),
    mediaTablet (`
      > .x__footer {
        position: sticky;
        left: 0;
        bottom: 0px;
      }
      > .x__cookies {
        // position: sticky;
        // left: 0;
        // bottom: 0px;
      }
      > .x__ac-footer {
      }
    `),
  )}
`

const dispatchTable = {
  appMountedDispatch: appMounted,
}

const selectorTable = {
  error: selectError,
}

const router = (passProps) => createBrowserRouter ([
  { path: '/', element: <Main page='landing' passProps={passProps}/>},
  { path: '/about', element: <Main page='about' passProps={passProps}/>},
  { path: '/detail/:theId', element: <Main page='detail' passProps={passProps}/>},
  { path: '/login', element: <Main page='login' passProps={passProps}/>},
  { path: '/login/:email', element: <Main page='login' passProps={passProps}/>},
  { path: '/search', element: <Main page='search' passProps={passProps}/>},
  { path: '/search/:query', element: <Main page='search' passProps={passProps}/>},
  { path: '/user', element: <Main page='user' passProps={passProps}/>},
  { path: '/init-password/:email/:token', element: <Main page='init-password' passProps={passProps}/>},
  { path: '/reset-password/:email/:token', element: <Main page='reset-password' passProps={passProps}/>},
  { path: '/user-admin', element: <Main page='user-admin' passProps={passProps}/>},
  { path: '*', element: <NotFoundPage/>},
])

const GA = () => {
  const ref = useRef (null)
  const tag = process.env.APP_ENV | lookupOnOr (
    (env) => die ('bad env: ' + env), {
      dev: null,
      tst: 'G-GFM5SQNH3M',
      acc: 'G-36JMLHTR78',
      prd: 'G-SE1M23CJ6S',
    },
  )
  useEffect (() => {
    if (nil (tag)) return
    const script = document.createElement ('script')

    script.setAttribute ('async', '')
    script.setAttribute ('src', 'https://www.googletagmanager.com/gtag/js?id=' + tag)
    ref.current.appendChild (script)

	window.dataLayer ||= []
	function gtag () { window.dataLayer.push (arguments) }
	gtag ('js', new Date)
	gtag ('config', tag)
  }, [tag])
  return <div ref={ref}/>
}

const CookiesS = styled.div`
  border: 3px solid #999999;
  padding: 10px;
  background: white;
  font-size: 17px;
  p:nth-child(1) {
    margin-top: -3px;
  }
  > .x__buttons {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    > .x__button {
      margin-top: 10px;
      > * {
        flex: 0 0 auto;
      }
      .Button__abcdef {
        &:hover {}
      }
    }
  }
`

const Cookies = container2 (
  ['Cookies'],
  ({ isMobile, }) => {
    const dispatch = useDispatch ()
    const onClicks = [false, true] | map ((allow) => useCallbackConst (
      () => dispatch (allowAnalyticalUpdate (allow)),
    ))
    return <CookiesS>
      <p>Wij gebruiken functionele cookies om bij te houden of een gebruiker ingelogd is.</p>
      <p>We gebruiken analytische cookies — mits jij akkoord gaat — om het gebruik van onze diensten te
        meten.</p>
      <div className='x__buttons'>
        <div className='x__button'>
          <Button cls='Button__abcdef' className='x__no' onClick={onClicks [0]}>
            Nee, dankje.
          </Button>
        </div>
        <div className='x__button'>
          <Button cls='Button__abcdef' className='x__yes' onClick={onClicks [1]}>
            Prima, ik sta {isMobile ? '' : 'het gebruik van '}analytische cookies toe.
          </Button>
        </div>
      </div>
    </CookiesS>
  },
)

const FooterS = styled.div`
  ${mediaQuery (
    mediaTablet ('height: auto'),
  )}
  > .x__main {
    padding-top: 30px;
    padding-left: 5%;
    padding-right: 5%;
    min-height: 675px;
    background: ${colors.highlight};
    color: white;
    height: 100%;
    > .x__socials {
      display: flex;
      justify-content: space-evenly;
      padding-top: 60px;
      margin-right: 20%;
      margin-left: 20%;
    }
    > .x__actions {
      font-size: 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-evenly;
      margin-top: 40px;
      margin-right: 10%;
      margin-left: 10%;
      > * {
        ${mediaQuery (
          mediaPhone (`
            flex: 0 0 100%;
            text-align: center;
            margin-bottom: 10px;
          `),
          mediaTablet (`
            flex: 0 0 60%;
            height: 50px;
            margin-bottom: 0px;
          `),
          mediaDesktop (`
            flex: 0 0 auto;
          `),
        )}
      }
    }
    > .x__grid {
      margin-top: 60px;
      display: flex;
      justify-content: space-evenly;
      flex-wrap: wrap;
      > .x__block {
        flex-grow: 0;
        flex-shrink: 0;
        > .x__title {
          font-size: 25px;
          font-weight: bold;
        }
        > .x__content {
          font-size: 20px;
          .x__small {
          }
        }
        > .x__contact {
          a {
            text-decoration: none;
            color: inherit;
            &:hover {
            }
          }
        }
        ${mediaQuery (
          mediaPhone (`
            margin-top: 10px;
          `),
          mediaTablet (`
            margin-top: 0px;
          `),
          mediaDesktop (`
          `),
        )}
      }
    }
    > .x__copyright-wrapper {
      margin-top: 80px;
      display: flex;
      justify-content: space-evenly;
      > .x__copyright {
        font-size: 15px;
      }
    }
    ${mediaQuery (
      mediaPhone (`
        > .x__grid {
          > .x__block {
            flex-basis: 100%;
            margin-bottom: 15px;
          }
        }
      `),
      mediaTablet (`
        > .x__grid {
          > .x__block {
            flex-basis: 25%;
            margin-bottom: initial;
          }
        }
      `),
    )}
  }
`

const AS = styled.a`
  color: inherit;
  text-decoration: none;
  cursor: pointer;
`

const LinkElementS = styled.div`
  > a {
    > .x__inner {
      color: white;
      &:hover {
        color: ${colors.highlight2};
      }
      ${prop ('attention') >> whenTrue (
        () => `
          border-radius: 100px;
          padding: 8px 12px;
          color: ${colors.highlight};
          background: white;
          cursor: pointer;
          a {
            margin: 15px;
            vertical-align: middle;
          }
          &:hover {
            color: initial;
            background: ${colors.highlight2};
          }
        `,
      )}
    }
  }
`

const LinkElement = ({ attention, text, link, target }) => <LinkElementS attention={attention}>
  <AS href={link} target={target}>
    <div className='x__inner'>
      {text}
    </div>
  </AS>
</LinkElementS>

const SocialS = styled.div`
  height: 30px;
  width: 30px;
  flex-grow: 0;
  flex-shrink: 0;
`

const Social = ({ img, link, target, }) => <SocialS>
  <a href={link} target={target}>
    <img src={img}/>
  </a>
</SocialS>

const Footer = () => {
  return <FooterS className='text'>
    <div className='x__main'>
      <div className='x__socials'>
        <Social img={imageIconFacebook} link={linkFacebookAUP} target={'_blank'}/>
        <Social img={imageIconInstagram} link={linkInstagramAUP} target={'_blank'}/>
        <Social img={imageIconLinkedin} link={linkLinkedinAUP} target={'_blank'}/>
        <Social img={imageIconXTwitter} link={linkXTwitterAUP} target={'_blank'} />
      </div>
      <div className='x__actions'>
        <LinkElement attention={true} text="Abonnee worden" link={emailLinkAbonneeWordenAUP} target={'_blank'}/>
        <LinkElement attention={true} text="Meld een fonds aan" link={emailLinkMeldFondsAan}/>
        <LinkElement attention={true} text="Suggesties" link={emailLinkAanmerkingen}/>
        <LinkElement attention={true} text="AUP nieuwsbrief" link={linkNieuwsbriefAUP}/>
      </div>
      <div className='x__grid'>
        <div className='x__block'>
          <div className='x__title'>
            Contact
          </div>
          <div className='x__content x__contact'>
            <div className='x__small'>Amsterdam University Press</div>
            <div className='x__small'>Nieuwe Prinsengracht 89</div>
            <div className='x__small'>1018 VR Amsterdam</div>
            <div className='x__small'>Nederland</div>
            <div className='x__small'>Tel: 020-4200050<br/> (ma-vr 14:00-16:00) </div>
            <div className='x__small'><a href='mailto:support@aup.nl'>support@aup.nl</a></div>
          </div>
        </div>
        <div className='x__block'>
          <div className='x__title'>
            Onze uitgaves
          </div>
          <div className='x__content'>
            <LinkElement text={"Toegang en abonnementen"} link={linkToegangEnAbonnementen} target={'_blank'}/>
            <LinkElement text={"Tijdschriften"} link={linkTijdschriften} target={'_blank'}/>
            <LinkElement text={"Collecties"} link={linkCollecties} target={'_blank'}/>
            <LinkElement text={"Boeken"} link={linkBoeken} target={'_blank'}/>
            <LinkElement text={"Textboeken"} link={linkTextboeken} target={'_blank'}/>
          </div>
        </div>
        <div className='x__block'>
          <div className='x__title'>
            Over AUP
          </div>
          <div className='x__content'>
            <LinkElement text={"Over ons"} link={linkOverOnsAUP} target={'_blank'}/>
            <LinkElement text={"Contact"} link={linkContactAUP} target={'_blank'}/>
            <LinkElement text={"Nieuwsberichten en artikelen"} link={linkArtikelenAUP} target={'_blank'}/>
            <LinkElement text={"Privacybeleid"} link={linkPrivacybeleidAUP} target={'_blank'}/>
            <LinkElement text={"Vacatures"} link={linkVacaturesAUP} target={'_blank'}/>
          </div>
        </div>
        <div className='x__block'>
          <div className='x__title'>
            Filantropie
          </div>
          <div className='x__content'>
            <LinkElement text='De Dikke Blauwe' link={linkDikkeBlauwe} target={'_blank'}/>
          </div>
        </div>
      </div>
      <div className='x__copyright-wrapper'>
        <div className='x__copyright'>© Amsterdam University Press 2024</div>
      </div>
    </div>
  </FooterS>
}

export default container (
  ['App', dispatchTable, selectorTable],
  (props) => {
    const { error, history, appMountedDispatch, } = props
    const allowAnalytical = useSelector (selectAllowAnalytical)
    const cookiesDecided = useSelector (selectCookiesDecided)
    const userLoggedIn = useSelector (selectUserLoggedIn)

    useWhy ('App', props)
    useReduxReducer ({ createReducer, key: 'domain', reducer: domainReducer, })
    useReduxReducer ({ createReducer, key: 'ui', reducer: uiReducer, })
    useReduxReducer ({ createReducer, key: 'app', reducer: appReducer, })
    // --- 'key' is only used so that hot reloading works properly with sagas.
    useSaga ({ saga, key: 'App', })

    const [isMobile, setIsMobile] = useState (void 8)
    const [fontLoaded, setFontLoaded] = useState (false)

    const [width, ref] = useMeasureWithCb (
      (_node, check) => window.addEventListener ('resize', check),
      prop ('width'),
    )

    const showCookiesMessage = userLoggedIn && not (cookiesDecided)

    useEffect (() => {
      fontMainFamily
        | startFontObserver
        // --- if the font fails, keep going.
        | recover (console.error)
        | then (() => setFontLoaded (true))
    }, [])

    useEffect (() => {
      width | whenOk (
        isMobileWidth >> setIsMobile,
      )
    }, [width])

    useEffect (
      () => {
        appMountedDispatch ()
        return () => iwarn ('App unmounting, unexpected')
      },
      [appMountedDispatch],
    )

    // --- note that after mounting, isMobile is still false for an instant, even on mobile.
    const passProps = { history, isMobile, }
    const cls = clss (
      isMobile | whenTrueV ('x--mobile'),
    )

    if (process.env.APP_ENV | notContainedInV (['dev', 'tst', 'acc', 'prd']))
      return 'Missing/invalid APP_ENV'

    if (not (fontLoaded)) return null

    return error | ifTrue (
      () => <div>
        <div>Sorry, but we’ve encountered a fatal error.</div>
        <div>Please reload the page and start again.</div>
      </div>,

      () => <ErrorBoundary>
        <Toast/>
        <AppWrapper ref={ref} className={cls}>
          <div className='x__main'>
            {fontLoaded | ifFalse (
              () => '',
              () => <RouterProvider router={router (passProps)}/>
            )}
          </div>
          <div className='x__footer'>
            <Footer/>
          </div>
          {allowAnalytical && <GA/>}
          {showCookiesMessage && <div className='x__cookies'>
            <div>
              <Cookies isMobile={isMobile}/>
            </div>
          </div>
          }
          <div className='x__ac-footer'>
            <AlleyCatFooter isMobile={isMobile} type='simple'
              textStyle={{
              }}
            />
          </div>
        </AppWrapper>,
      </ErrorBoundary>,
    )
  },
)
