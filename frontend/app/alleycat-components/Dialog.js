import {
  pipe, compose, composeRight,
  merge, invoke, noop, not,
} from 'stick-js/es'

import React, { useMemo, useCallback, useCallbackConst, useEffect, useRef, useState, } from 'react'

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

import iconX from './x-je-blue.svg'

const {
  'app.element': appElement,
  'general.appWrapperSelector': appWrapperSelector,
} = configTop.gets (
  'app.element',
  'general.appWrapperSelector',
)
Modal.setAppElement (appElement)

const styleOverlayBase = invoke (() => {
  const base = {
    backgroundcolor: '',
    zIndex: 1000,
  }
  return (_isMobile) => base
})

const styleContentBase = invoke (() => {
  const base = {
    opacity: 1,
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    padding: '0',
    width: '50%',
    borderRadius: '10px',
  }
  const mobile = {
  }
  const notMobile = {
  }
  return (isMobile) => ({
    ... base,
    ... isMobile ? mobile : notMobile,
  })
})

const ModalContentsS = styled.div`
  height: 100%;
  font-size: 20px;
  .x__close {
    position: absolute;
    right: 10px;
    top: 10px;
    height: 30px;
    width: 30px;
    cursor: pointer;
    border: 1px solid black;
    border-radius: 1000px;
    > img {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translateX(-50%) translateY(-50%);
    }
  }
  ${mediaQuery (
    mediaPhoneOnly (`
      // box-shadow: 1px 1px 5px 1px;
      border: 0;
      .x__close {
        top: 10px;
        right: 20px;
      }
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
    isOpen,
    onRequestClose=noop,
    onAfterClose: onAfterCloseProp=noop,
    closeOnOverlayClick=false, showCloseButton=false,
    styleOverlay={},
    styleContent=isMobile ? { width: '100%', maxWidth: '100%', height: '100%'} : {},
  }) => {
    const everythingElse = useMemo (
      () => document.querySelector (appWrapperSelector),
      [],
    )
    const updateEverythingElse = useCallback ((forceClose=false) => {
      if (!everythingElse) return
      if (not (isOpen) || forceClose) everythingElse.classList.remove ('x--dialog-open')
      else everythingElse.classList.add ('x--dialog-open')
    }, [everythingElse, isOpen])
    const onAfterClose = useCallback ((... args) => {
      onAfterCloseProp (... args)
      updateEverythingElse (true)
    }, [updateEverythingElse])
    useEffect (() => { updateEverythingElse () }, [updateEverythingElse])
    return <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      onAfterClose={onAfterClose}
      shouldCloseOnOverlayClick={closeOnOverlayClick}
      style={{
        content: styleContentBase (isMobile) | merge (styleContent),
        overlay: styleOverlayBase (isMobile) | merge (styleOverlay),
      }}
    >
      <ModalContentsS>
        <ModalContents2S>
          {showCloseButton &&
            <div className='x__close' onClick={onRequestClose}>
              <img src={iconX} width='10px'/>
            </div>}
          {children}
        </ModalContents2S>
      </ModalContentsS>
    </Modal>
  },
)
