import React from 'react';
import { ToastContainer, } from 'react-toastify'

import styled from 'styled-components'

import 'react-toastify/dist/ReactToastify.css'

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
    hideProgressBar={true}
    autoClose={8000}
  />
}
