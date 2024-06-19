import {
  pipe, compose, composeRight,
  lets,
} from 'stick-js/es'

/* For generators (regenerator runtime) and built-ins like 'Reflect'.
 * In the @babel/preset-env section of the babel config, set 'useBuiltIns' to 'entry' and 'corejs'
 * to the right version.
 * core-js will figure out what needs to get polyfilled based on the 'targets' or 'browserslist'
 * options.
 */
import 'core-js/stable'
import 'regenerator-runtime/runtime'

// --- misc. polyfills, e.g. IE Node methods.
import './polyfills'

import './manifest.json'

import './images/icons/favicon.ico'
import './images/static-hero-fb.png'
// --- @todo do we still need this?
import './images/static-logo-aup.png'
import './images/static-logo-aup.svg'
import './images/icons/static-android-chrome-192x192.png'
import './images/icons/static-android-chrome-512x512.png'

import React, { Fragment, } from 'react'
import { createRoot, } from 'react-dom/client'
import { Provider, } from 'react-redux'

; `
Might need to use hash history (or possibly memory history?) if files will be served using the file:// protocol (e.g. a hybrid app) or from static files (i.e. a build/ directory served by e.g. nginx).
In that case, see if we need 'withRouter' from react-router-dom to fix the 'blocked route updates' problem.
`

import createHistory from 'history/createBrowserHistory'

import 'sanitize.css/sanitize.css'

import { prepareIntl, } from 'alleycat-js/es/react-intl'

/*
// --- css-loader: importing css here makes it available to all components.
import './xxx.css'
*/

import { initStore, } from './redux'
import { GlobalStyle, } from './global-styles'

import { App, } from './containers/App/Loadable'

const initialState = {}

const store = initStore (initialState)
const root = createRoot (document.getElementById ('app'))

const history = createHistory ()

const renderApp = () => root.render (
  <Fragment>
    <Provider store={store}>
      <App history={history}/>
    </Provider>
    <GlobalStyle/>
  </Fragment>
)

// --- this example is from react-boilerplate but doesn't seem to be necessary any more.
if (false && module.hot) {
  module.hot.accept (
    './containers/App',
    () => {
      root.unmount ()
      renderApp ()
    },
  )
  module.hot.accept ()
}

renderApp ()
