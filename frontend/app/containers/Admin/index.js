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
const colorHighlight = configTop.get ('colors.highlightAlpha')

const AdminS = styled.div`
  min-height: 300px;
  width: 80%;
  margin: auto;
  margin-top: 100px;
  border: 1px solid black;
  border-radius: 10px;
  padding: 58px;
  background: ${colorHighlight};
  font-size: 20px;
  > .x__main {
    display: grid;
    grid-template-columns: auto auto;
    grid-auto-rows: 70px;
    > .row {
      display: contents;
      // cursor: pointer;
      &:hover {
        > * {
          // margin: 0px;
          // border: 2px solid #bdffb3ff;
        }
      }
      > * {
        // margin: 2px;
      }
      > .col0 {
        border-right: 2px solid black;
      }
      > .col0, > .col1 {
        padding: 10px;
      }
    }
    > .x__header {
      border-bottom: 2px solid black;
    }
    > .x__name, .x__email {
    }
  }
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
      <div className='x__main'>
        {users | requestResults ({
          onError: noop,
          onResults: (data) => <>
            <div className='col0 x__header'>
              Naam
            </div>
            <div className='col1 x__header'>
              Emailadres
            </div>
            {data | map (({ email, firstName, lastName, }) => <div className='row' key={email}>
              <div className='col0 x__name'>
                {firstName} {lastName}
              </div>
              <div className='col1 x__email'>
                {email}
              </div>
            </div>
            )}
          </>
        })}
      </div>
    </AdminS>
  }
)
