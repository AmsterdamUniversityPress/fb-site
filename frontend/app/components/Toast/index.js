import React from 'react';
import {ToastContainer, cssTransition as toastCssTransition} from 'react-toastify';

import styled from 'styled-components'

import 'react-toastify/dist/ReactToastify.css'

const ToastTransition = toastCssTransition ({
  enter: 'Toastify__slide-enter',
  exit: 'Toastify__slide-exit',
  duration: [300, 100],
  appendPosition: true
})

const ToastContainerS = styled (ToastContainer)`
  .Toastify__toast--error {
    background: #b21515;
    color: white;
    .Toastify__close-button {
      color: white;
    }
  }
  .Toastify__toast--info {
    color: black;
  }
`

export default function ToastComponent() {
  return <ToastContainerS
    transition={ToastTransition}
    hideProgressBar={true}
    autoClose={8000}
  />
}
