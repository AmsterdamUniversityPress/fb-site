import {
  pipe, compose, composeRight,
  map, noop, F, T,
  allAgainst,
} from 'stick-js/es'

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState, } from 'react'
import { keyPressListen, useNavigate, } from 'react-router-dom'

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
  selectEmailRequestPending,
  selectUsers,
  selectUserAddPending,
  selectUserRemovePending,
} from './selectors'

import {
  sendWelcomeEmail, userAdd, userRemove, usersFetch,
} from '../App/actions/main'

import CloseIcon from '../../components/svg/CloseIcon'
import { Button, } from '../../components/shared'
import { spinner, } from '../../alleycat-components'
import Dialog from '../../alleycat-components/Dialog'

import { container, useWhy, keyDownListen, isNotEmptyString,
  mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth,
  requestResults, } from '../../common'
import config from '../../config'

const configTop = configure.init (config)
const colorHighlight = configTop.get ('colors.highlightAlpha')

const Spinner = spinner ('comet')

const AdminS = styled.div`
  min-height: 300px;
  width: 80%;
  min-width: 850px;
  margin: auto;
  margin-top: 100px;
  border: 1px solid black;
  border-radius: 10px;
  padding: 58px;
  background: white;
  font-size: 20px;
  > .x__main {
    display: grid;
    grid-template-columns: auto auto 300px auto;
    grid-auto-rows: 90px;
    > .x__header {
      opacity: 0.6;
      border-bottom: 2px solid #00000022;
    }
    > .x__addUser {
      display: contents;
      .x__buttons {
        font-size: 16px;
      }
      input {
        width: 50%;
        border: 1px solid black;
      }
      > .col0 {
        border-left: 2px solid #00000022;
      }
      > .col3 {
        border-right: 2px solid #00000022;
        min-width: 32px;
      }
      > .col0, > .col1 {
        border-right: 1px solid #00000022;
      }
      > .col0, > .col1, > .col2, .col3 {
        padding: 10px;
        border-bottom: 2px solid #00000022;
        display: flex;
        align-items: center;
        > * {
          vertical-align: middle;
          flex: 0 0 auto;
        }
      }
    }
    > .data-row {
      font-size: 18px;
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
        border-left: 2px solid #00000022;
      }
      > .col3 {
        border-right: 2px solid #00000022;
        min-width: 32px;
      }
      > .col0, > .col1 {
        border-right: 1px solid #00000022;
      }
      > .col0, > .col1, > .col2, .col3 {
        padding: 10px;
        border-bottom: 2px solid #00000022;
        display: flex;
        align-items: center;
        > * {
          vertical-align: middle;
          flex: 0 0 auto;
        }
      }
      > .col0, > .col1 {
      }
      > .x__name, .x__email {
      }
      > .x__buttons {
        font-size: 16px;
        .x__buttons-flex {
          display: flex;
          height: 100%;
          justify-content: space-around;
          flex-direction: column;
          > * {
            flex: 0 0 auto;
          }
        }
      }
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
  sendWelcomeEmailDispatch: sendWelcomeEmail,
  usersFetchDispatch: usersFetch,
  userAddDispatch: userAdd,
  userRemoveDispatch: userRemove,
}

const selectorTable = {
  users: selectUsers,
  emailRequestPending: selectEmailRequestPending,
  userRemovePending: selectUserRemovePending,
  userAddPending: selectUserAddPending,
}

export default container (
  ['Admin', dispatchTable, selectorTable],
  (props) => {
    const {
      users,
      userRemoveDispatch,
      userAddDispatch,
      sendWelcomeEmailDispatch,
      usersFetchDispatch,
      userRemovePending, userAddPending, emailRequestPending,
    } = props

    const [emailToRemove, setEmailToRemove] = useState (null)
    const [removeDialogOpen, setRemoveDialogOpen] = useState (false)
    const [firstName, setFirstName] = useState ('')
    const [lastName, setLastName] = useState ('')
    const [email, setEmail] = useState ('')
    const [privileges, setPrivileges] = useState ([])

    const closeRemoveDialog = useCallbackConst (F >> setRemoveDialogOpen)
    const openRemoveDialog = useCallbackConst (T >> setRemoveDialogOpen)
    const pending = (email) => emailRequestPending.has (email) || userRemovePending.has (email) || userAddPending

    const navigate = useNavigate ()

    const onClickClose = useCallbackConst (() => {
      navigate ('/')
    })
    const onClickRemoveCancel = useCallback (() => {
      closeRemoveDialog ()
    }, [userRemoveDispatch, emailToRemove])
    const onClickRemoveConfirm = useCallback (() => {
      userRemoveDispatch (emailToRemove)
      closeRemoveDialog ()
    }, [userRemoveDispatch, emailToRemove])
    const onClickRemove = useCallback ((email) => {
      openRemoveDialog ()
      setEmailToRemove (email)
    })
    const onClickResendMail = useCallback (
      (email) => sendWelcomeEmailDispatch (email),
      [sendWelcomeEmailDispatch],
    )

    const onChangeFirstName = useCallbackConst (
      (event) => setFirstName (event.target.value),
    )
    const onChangeLastName = useCallbackConst (
      (event) => setLastName (event.target.value),
    )
    const onChangeEmail = useCallbackConst (
      (event) => setEmail (event.target.value),
    )
    const onChangePrivileges = useCallbackConst (
      (event) => setPrivileges ([event.target.value]),
    )
    const doUserAdd = useCallback (
      () => userAddDispatch (email, firstName, lastName, privileges),
      [firstName, lastName, email, privileges, userAdd],
    )
    const canUserAdd = useMemo (
      () => [firstName, lastName, email, privileges] | allAgainst (isNotEmptyString),
      [firstName, lastName, email, privileges],
    )
    const onKeyDownInput = useCallback (
      (event) => event | keyDownListen (
        () => {
          event.preventDefault ()
          canUserAdd && doUserAdd ()
        },
        'Enter',
      ),
      [canUserAdd, doUserAdd],
    )
    const onClickUserAdd = useCallback (
      () => doUserAdd (),
      [doUserAdd]
    )

    useEffect (() => {
      usersFetchDispatch ()
    }, [usersFetchDispatch])

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
              E-mailadres
            </div>
            <div className='col2 x__header'/>
            <div className='col3 x__header'/>
            {data | map (({ email, firstName, lastName, }) => <div className='data-row' key={email}>
              <Dialog
                isOpen={removeDialogOpen}
                onRequestClose={closeRemoveDialog}
                /* --- @todo did we used to have these?
                onYes={clickDialogYes (email)}
                onNo={closeRemoveDialog}
                */
              >
                <p>
                  Gebruiker <span className='x__email-to-remove'>{emailToRemove}</span> wordt onherroepelijk verwijderd.
                </p>
                <p>
                  Weet je zeker dat je wil doorgaan?
                </p>
                <Button onClick={onClickRemoveConfirm}>
                  Ja
                </Button>
                <Button onClick={onClickRemoveCancel}>
                  Nee
                </Button>
              </Dialog>
              <div className='col0 x__name'>
                {firstName} {lastName}
              </div>
              <div className='col1 x__email'>
                {email}
              </div>
              <div className='col2 x__buttons'>
                <div className='x__buttons-flex'>
                  <Button onClick={() => onClickResendMail (email)}>
                    welkomst e-mail opnieuw versturen
                  </Button>
                  <Button onClick={() => onClickRemove (email)}>
                    gebruiker verwijderen
                  </Button>
                </div>
              </div>
              <div className='col3'>
                {pending (email) && <Spinner size={20}/>}
              </div>
            </div>
            )}
            <div className='x__addUser'>
              <div className='col0'>
                <input type='text' onChange={onChangeFirstName} onKeyDown={onKeyDownInput}/>
                <input type='text' onChange={onChangeLastName} onKeyDown={onKeyDownInput}/>
              </div>
              <div className='col1'>
                <input type='text' onChange={onChangeEmail} onKeyDown={onKeyDownInput}/>
              </div>
              <div className='col2'>
                <input type='text' onChange={onChangePrivileges} onKeyDown={onKeyDownInput}/>
              </div>
              <div className='col3'>
                <div className='x__buttons'>
                  <Button onClick={onClickUserAdd}>
                    gebruiker toevoegen
                  </Button>
                </div>
              </div>
            </div>
          </>
        })}
      </div>
    </AdminS>
  }
)
