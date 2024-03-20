import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import React, { Fragment, useCallback, useEffect, useRef, useState, } from 'react'
import { useNavigate, } from 'react-router-dom'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import {} from 'alleycat-js/es/general'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useSaga, } from 'alleycat-js/es/redux-hooks'
import { media, mediaQuery, } from 'alleycat-js/es/styled'

import {} from './actions'
import reducer from './reducer'
import saga from './saga'
import {} from './selectors'

// import {} from '../../components/X/Loadable'
import CloseIcon from '../../components/svg/CloseIcon'

import { container, getMessages, useWhy, mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth, } from '../../common'
import config from '../../config'

const configTop = configure.init (config)
const colorHighlight = configTop.get ('colors.highlight')


const AdminS = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  // @todo the following properties are from TextBoxS from Main
  position: relative;
  padding: 38px;
  padding-top: 58px;
  border: 1px solid black;
  border-radius: 10px;
  background: ${colorHighlight};
  font-size: 20px;
  width: 100%;

  .x__close {
     position: absolute;
     top: 8px;
     right: 8px;
     cursor: pointer;
     width: 48px;
     height: 43px;
     display: flex;
    * {
      margin: auto;
    }
  }
`

const dispatchTable = {
}

const selectorTable = {
}

export default container (
  ['Admin', dispatchTable, selectorTable],
  (props) => {
    const {} = props

    const navigate = useNavigate ()
    const onClickClose = useCallbackConst (() => {
      navigate ('/')
    })

    useWhy ('Admin', props)
    useSaga ({ saga, key: 'Admin', })

    return <AdminS>
        <div className='x__close' onClick={onClickClose}>
          <CloseIcon
            height={25}
            width={25}
            strokeWidth='0.6px'
          />
        </div>
      ADMIN
    </AdminS>
  }
)
