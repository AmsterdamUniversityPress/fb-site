import {
  pipe, compose, composeRight,
  map, dot, dot1, die, sprintf1,
  prop, whenOk, ifFalse, ifTrue,
  eq,
} from 'stick-js/es'

import React, { useCallback, useEffect, useRef, useState, } from 'react'
import styled from 'styled-components'
import { createBrowserRouter, RouterProvider, } from 'react-router-dom'
import { connect, } from 'react-redux'
import { createStructuredSelector, } from 'reselect'

import FontFaceObserver from 'fontfaceobserver'

import { then, recover, promiseToEither, allP, } from 'alleycat-js/es/async'
import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { fontFace, cssFont, } from 'alleycat-js/es/font'
import { logWith, info, warn, iwarn, setTimeoutOn, } from 'alleycat-js/es/general'
import { whenPredicateResult, whenTrueV, ifEmptyString, } from 'alleycat-js/es/predicate'
import { useMeasureWithCb, } from 'alleycat-js/es/react'
import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import domainReducer from './store/domain/reducer'
import { selectError, } from './store/domain/selectors'
import uiReducer from './store/ui/reducer'
import appReducer from './store/app/reducer'

import { appMounted, } from './actions/main'
import saga from './sagas/main'

import { ErrorBoundary, } from '../../components/ErrorBoundary'
import { Main, } from '../../containers/Main/Loadable'
import NotFoundPage from '../../containers/NotFoundPage'
import Toast from '../../components/Toast'

import { againstNone, notContainedInV, container, mediaPhone, mediaTablet, mediaDesktop, isMobileWidth, useWhy, } from '../../common'
import config from '../../config'

const configTop = config | configure.init

const fontMainFamily = 'font.main.family' | configTop.get

const fontStyles = [
  ['normal', 'normal'],
  ['normal', 'italic'],
  ['bold', 'normal'],
  ['bold', 'italic'],
]

const loadFont = 'load' | dot
const slice = dot1 ('slice')

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
  overflow-y: hidden;
  margin: 0 auto;
  height: 100%;
  font-family: Arial;
`

const dispatchTable = {
  appMountedDispatch: appMounted,
}

const selectorTable = {
  error: selectError,
}

const router = (passProps) => createBrowserRouter ([
  { path: '/', element: <Main page='overview' passProps={passProps}/>},
  { path: '/detail/:uuid', element: <Main page='detail' passProps={passProps}/>},
  { path: '/login', element: <Main page='login' passProps={passProps}/>},
  { path: '/login/:email', element: <Main page='login' passProps={passProps}/>},
  { path: '/user', element: <Main page='user' passProps={passProps}/>},
  { path: '/init-password/:email/:token', element: <Main page='init-password' passProps={passProps}/>},
  { path: '/reset-password/:email/:token', element: <Main page='reset-password' passProps={passProps}/>},
  { path: '/user-admin', element: <Main page='user-admin' passProps={passProps}/>},
  { path: '*', element: <NotFoundPage/>},
])

export default container (
  ['App', dispatchTable, selectorTable],
  (props) => {
    const { error, history, appMountedDispatch, } = props

    useWhy ('App', props)
    useReduxReducer ({ createReducer, key: 'domain', reducer: domainReducer, })
    useReduxReducer ({ createReducer, key: 'ui', reducer: uiReducer, })
    useReduxReducer ({ createReducer, key: 'app', reducer: appReducer, })
    // --- 'key' is only used so that hot reloading works properly with sagas.
    useSaga ({ saga, key: 'App', })

    const [isMobile, setIsMobile] = useState (void 8)
    const [fontLoaded, setFontLoaded] = useState (false)

    const [width, ref] = useMeasureWithCb (
      (node, check) => window.addEventListener ('resize', check),
      prop ('width'),
    )

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

    if (process.env.APP_ENV | notContainedInV (['tst', 'acc', 'prd']))
      return 'Missing/invalid APP_ENV'

    return error | ifTrue (
      () => <div>
        <div>Sorry, but we’ve encountered a fatal error.</div>
        <div>Please reload the page and start again.</div>
      </div>,

      () => <ErrorBoundary>
        <Toast/>
        <AppWrapper ref={ref} className={cls}>
          {fontLoaded | ifFalse (
            () => '',
            () => <RouterProvider router={router (passProps)}/>
          )}
        </AppWrapper>,
      </ErrorBoundary>,
    )
  },
)
