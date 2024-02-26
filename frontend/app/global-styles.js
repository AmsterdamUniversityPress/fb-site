import {
  pipe, compose, composeRight, sprintf1
} from 'stick-js/es'

import { createGlobalStyle, } from 'styled-components'

import configure from 'alleycat-js/es/configure'

import config from './config'

const configTop = config | configure.init

const fontMainCss = 'font.main.css' | configTop.get
const fontMainFamily = 'font.main.family' | configTop.get

// --- remember to use normal syntax for injecting variables (normal strings, not functions).

export const GlobalStyle = createGlobalStyle`
  ${fontMainCss}

  // --- note: on mobile, height = 100vh includes url bar height and soft buttons, while 100%
  // doesn't.

  html, body {
    height: 100%;
    width: 100%;
    position: fixed;
    overflow: hidden;
  }

  body {
    font-family: ${fontMainFamily};
    color: #333;
  }

  h1, h2, h3, h4, p {
    cursor: text;
  }

  #app {
    height: 100%;
    width: 100%;
  }

  .x--mobile {
    .m--hide {
      display: none;
    }
  }

  .u-cursor-pointer {
    cursor: pointer !important;
  }

  .u--display-none {
    display: none !important;
  }

  .u--hide {
    visibility: hidden !important;
  }
`
