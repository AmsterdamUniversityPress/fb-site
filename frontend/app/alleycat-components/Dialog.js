import {
  pipe, compose, composeRight,
  merge,
} from 'stick-js/es'

import React, { useMemo, useCallback, useEffect, useRef, useState, } from 'react'

import Modal from 'react-modal'
import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { logWith, } from 'alleycat-js/es/general'
import {} from 'alleycat-js/es/predicate'
import {} from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { useWhy, mediaPhone, mediaPhoneOnly, mediaTablet, mediaDesktop, component, } from '../common'
import config from '../config'

const configTop = config | configure.init

const {
  'general.appElement': appElement,
  'general.appWrapperSelector': appWrapperSelector,
} = configTop.gets (
  'general.appElement',
  'general.appWrapperSelector',
)
Modal.setAppElement (appElement)

const styleOverlayBase = {
  backgroundColor: '',
  zIndex: 1000,
}

const styleContentBase = {
  opacity: 1,
  top: '50%',
  left: '50%',
  right: 'auto',
  bottom: 'auto',
  marginRight: '-50%',
  transform: 'translate(-50%, -50%)',
  padding: '0',
  borderRadius: '10px',
  width: '50%',
}

const ModalContentsS = styled.div`
  height: 100%;
  font-size: 20px;
  .x__close {
    position: absolute;
    right: 10px;
    top: 10px;
    font-size: 20px;
    cursor: pointer;
  }
  ${mediaQuery (
    mediaPhoneOnly (`
      box-shadow: 1px 1px 5px 1px;
      border: 3px solid black;
      border-radius: 50px;
    `),
    mediaTablet (`
      border: 2px solid black;
      border-radius: 10px;
    `),
  )}
`

// --- @todo merge with ModalContentsS
const ModalContents2S = styled.div`
  height: 100%;
  width: 80%;
  margin: auto;
  padding: 30px;
  padding-left: 40px;
  button {
    min-width: 100px;
  }
  >.x__title {
    color: #fd60b5;
    margin: 10px;;
    text-align: center;
  }
  >.x__buttons {
    text-align: center;
  }
  >.x__contents {
    margin-top: 20px;
    margin-bottom: 25px;
    margin-left: 10px;
    margin-right: 10px;
    .x__warning-sign {
      text-align: center;
      margin-bottom: 20px;
      &::before {
        content: '⚠';
        font-size: 35px;
        background: pink;
        padding-left: calc(40% - 10px);
        padding-right: calc(40% - 10px - 10px);
        color: black;
      }
    }
  }
  ${mediaQuery (
    mediaPhoneOnly (`
      >.x__title {
        font-size: 35px;
      }
      >.x__buttons {
      }
      >.x__contents {
        font-size: 30px;
      }
  }
    `),
    mediaTablet (`
      >.x__title {
        font-size: 25px;
      }
    `),
  )}
`

export default component (
  ['Dialog'],
 ({
    children,
    isMobile,
    isOpen, onRequestClose,
    closeOnOverlayClick=false, showCloseButton=false,
    styleOverlay={},
    styleContent=isMobile ? { width: '100%', maxWidth: '100%', height: '100%'} : {},
  }) => {
    const everythingElse = useMemo (
      () => document.querySelector (appWrapperSelector),
      [],
    )
    useEffect (() => {
      if (!everythingElse) return
      console.log ('everythingElse', everythingElse)
      console.log ('isOpen', isOpen)
      if (isOpen) everythingElse.classList.add ('x--dialog-open')
      else everythingElse.classList.remove ('x--dialog-open')
    }, [everythingElse, isOpen])
    return <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      shouldCloseOnOverlayClick={closeOnOverlayClick}
      style={{
        content: styleContentBase | merge (styleContent),
        overlay: styleOverlayBase | merge (styleOverlay),
      }}
    >
      <ModalContentsS>
        <ModalContents2S>
          {showCloseButton &&
            <div className='x__close' onClick={onRequestClose}>
              x
            </div>}
          {children}
        </ModalContents2S>
      </ModalContentsS>
    </Modal>
  },
)
