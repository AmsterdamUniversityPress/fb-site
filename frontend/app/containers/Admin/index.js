import {
  pipe, compose, composeRight,
  map, noop,
} from 'stick-js/es'

import React, { Fragment, useCallback, useEffect, useRef, useState, } from 'react'
import { useNavigate, } from 'react-router-dom'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { logWith, } from 'alleycat-js/es/general'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useSaga, useReduxReducer, } from 'alleycat-js/es/redux-hooks'
import { media, mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import {} from './actions'
import reducer from './reducer'
import saga from './saga'
import {
  selectUsers,
} from './selectors'

// import {} from '../../components/X/Loadable'
import CloseIcon from '../../components/svg/CloseIcon'

import { container, useWhy, mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth, requestResults, } from '../../common'
import config from '../../config'

const configTop = configure.init (config)
const colorHighlight = configTop.get ('colors.highlight')

const AdminS = styled.div`
  height: 100%;
  width: 98%;
  position: relative;
  margin: 10px;
  padding: 58px;
  border: 1px solid black;
  border-radius: 10px;
  background: ${colorHighlight};
  font-size: 20px;
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

const UserRowS = styled.div`
  .x__name {
    border: 1px solid #999999;
    padding-right: 50px;
    width: 250px;
    display: inline-block;
  }
  .x__email {
    border: 1px solid #999999;
    width: 250px;
    display: inline-block;
  }
`

const UserRow = ({ email, firstName, lastName, }) => <UserRowS>
  <div className='x__name'>
  {firstName} {lastName}
  </div>
  <div className='x__email'>
  {email}
  </div>

</UserRowS>

const dispatchTable = {
}

const selectorTable = {
  users: selectUsers,
}

export default container (
  ['Admin', dispatchTable, selectorTable],
  (props) => {
    const { users, } = props
    const navigate = useNavigate ()
    const onClickClose = useCallbackConst (() => {
      navigate ('/')
    })

    useWhy ('Admin', props)
    useReduxReducer ({ createReducer, reducer, key: 'Admin', })
    useSaga ({ saga, key: 'Admin', })

    return <AdminS>
      <div className='x__close' onClick={onClickClose}>
        <CloseIcon
          height={25}
          width={25}
          strokeWidth='0.6px'
        />
      </div>
      { users | requestResults ({
        onError: noop,
        onResults: (data) => data
          | map (({ email, firstName, lastName, }) => <UserRow
              key={email}
              email={email}
              firstName={firstName}
              lastName={lastName}
            />
          )
        }
      )}
    </AdminS>
  }
)
