import {
  pipe, compose, composeRight,
  sprintfN,
} from 'stick-js/es'

import React, { PureComponent, } from 'react'

import { error, } from 'alleycat-js/es/general'

// --- must be class component until the hooks api is improved.

export class ErrorBoundary extends PureComponent {
  state = {
    hasError: false,
  }

  componentDidCatch (err, errorInfo) {
    ; [err, errorInfo.componentStack]
    | sprintfN ('Error caught at boundary ErrorBoundary: %s\n\n Component stack:%s')
    | error
  }

  static getDerivedStateFromError (_err) {
    return { hasError: true, }
  }

  render () {
    const { props, state, } = this
    const { children, } = props
    const { hasError, } = state

    if (hasError) return <div>
      <div>Sorry, but we’ve encountered a fatal error.</div>
      <div>Please reload the page and start again.</div>
    </div>

    return <>
      {children}
    </>
  }
}
