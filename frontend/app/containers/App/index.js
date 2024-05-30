import {
  pipe, compose, composeRight,
  map, dot, dot1, die, sprintf1,
  prop, whenOk, ifFalse, ifTrue,
  eq, nil, not,
} from 'stick-js/es'

import React, { useCallback, useEffect, useRef, useState, } from 'react'
import styled from 'styled-components'
import { createBrowserRouter, RouterProvider, } from 'react-router-dom'
import { useDispatch, useSelector, } from 'react-redux'

import FontFaceObserver from 'fontfaceobserver'

import { then, recover, promiseToEither, allP, } from 'alleycat-js/es/async'
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
const colors = configColors.gets (
  'highlight', 'highlightAlpha',
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
  font-family: Arial;

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
    ${mediaQuery (
      mediaTablet (`
        position: sticky; left: 0;
        bottom: 0px;
      `),
    )}
  }
  > .x__cookies {
    position: sticky;
    left: 0;
    bottom: 0px;
    width: 100%;
    // --- not sure why this is necessary
    margin-top: -12px;
    z-index: 1;
    background: #ffeaea;
    padding-top: 50px;
    padding-bottom: 50px;
    display: flex;
    justify-content: flex-end;
    > * {
      flex: 0 1 580px;
    }
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
  { path: '/detail/:uuid', element: <Main page='detail' passProps={passProps}/>},
  { path: '/login', element: <Main page='login' passProps={passProps}/>},
  { path: '/login/:email', element: <Main page='login' passProps={passProps}/>},
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
    // mediaPhone ('height: 100vh'),
    mediaTablet ('height: auto'),
  )}
  > .x__main {
    padding-top: 30px;
    padding-left: 50px;
    min-height: 728px;
    background: ${colors.highlight};
    color: white;
    height: 100%;
    > .x__contact {
      height: 200px;
    }
    > .x__grid {
      display: flex;
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
        }
      }
    }
    ${mediaQuery (
      mediaPhone (`
        > .x__grid {
          > .x__block {
            flex-basis: 100%;
          }
        }
      `),
      mediaTablet (`
        > .x__grid {
          > .x__block {
            flex-basis: 25%;
          }
        }
      `),
    )}
  }
`

const Footer = () => <FooterS>
  <div className='x__main'>
    <div className='x__contact'>
      <p>Contactformulier</p>
    </div>
    <div className='x__grid'>
      <div className='x__block'>
        <div className='x__title'>
          Onze uitgaves
        </div>
        <div className='x__content'>
          <p>1</p>
          <p>2</p>
          <p>3</p>
          <p>4</p>
          <p>5</p>
          <p>6</p>
        </div>
      </div>
      <div className='x__block'>
        <div className='x__title'>
          Blijf in contact
        </div>
        <div className='x__content'>
          <p>1</p>
          <p>2</p>
          <p>3</p>
          <p>4</p>
          <p>5</p>
          <p>6</p>
        </div>
      </div>
      <div className='x__block'>
        <div className='x__title'>
          Over AUP
        </div>
        <div className='x__content'>
          <p>1</p>
          <p>2</p>
          <p>3</p>
          <p>4</p>
          <p>5</p>
          <p>6</p>
        </div>
      </div>
      <div className='x__block'>
        <div className='x__title'>
          Filantropie
        </div>
        <div className='x__content'>
          <p>1</p>
          <p>2</p>
          <p>3</p>
          <p>4</p>
          <p>5</p>
          <p>6</p>
        </div>
      </div>
    </div>
  </div>
</FooterS>

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
