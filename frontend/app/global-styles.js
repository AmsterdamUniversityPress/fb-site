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

  .u-opacity-25 {
    opacity: 0.25;
  }

  .u-opacity-50 {
    opacity: 0.5;
  }

  .u--display-none {
    display: none !important;
  }

  .u--hide {
    visibility: hidden !important;
  }

  @keyframes toast--bounce-in-right {
    from,
    60%,
    75%,
    90%,
    to {
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
    from {
      opacity: 0;
      transform: translate3d(3000px, 0, 0);
    }
    60% {
      opacity: 1;
      transform: translate3d(-25px, 0, 0);
    }
    75% {
      transform: translate3d(10px, 0, 0);
    }
    90% {
      transform: translate3d(-5px, 0, 0);
    }
    to {
      transform: none;
    }
  }

  @keyframes toast--smooth {
    from {
      @include transform;
    }
    to {
      visibility: hidden;
      transform: translate3d(110%, var(--y), 0);
    }
  }

  .toast--smooth {
    animation: toast--smooth 0.1s linear both;
  }
  .toast--bounce-in-right {
    animation: toast--bounce-in-right 0.5s ease-out both;
  }
`
