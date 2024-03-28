import {
  pipe, compose, composeRight,
  map, noop, F, T, not,
  allAgainst,
} from 'stick-js/es'

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState, } from 'react'
import { keyPressListen, useNavigate, } from 'react-router-dom'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { logWith, trim, } from 'alleycat-js/es/general'
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
  selectUserAddSuccess,
  selectUserRemovePending,
  selectUserRemovePendingUsers,
} from './selectors'

import {
  sendWelcomeEmail, userAdd, userAddStart, userRemove, usersFetch,
} from '../App/actions/main'

import CloseIcon from '../../components/svg/CloseIcon'
import { AreYouSureDialog, BigButton, Button, MenuItem, } from '../../components/shared'
import { Input, } from '../../components/shared/Input'

import { spinner, } from '../../alleycat-components'

import {
  component, container, useWhy, keyDownListen, isNotEmptyString,
  mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth,
  requestResults, toastInfo,
} from '../../common'
import config from '../../config'
import Dialog from '../../alleycat-components/Dialog'

const configTop = configure.init (config)
const configIcons = configTop.focus ('icons')
const {
  add: iconAdd,
  more: iconMore,
  remove: iconRemove,
  update: iconUpdate,
} = configIcons.gets ('add', 'more', 'remove', 'update')

const Spinner = spinner ('comet')

const AdminS = styled.div`
  min-height: 300px;
  width: 100%;
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
    // grid-template-columns: [col0] auto [col1] auto [col2] 150px [col3] 300px [col4] auto [col-end];
    grid-template-columns: [col0] auto [col1] auto [col2] 0px [col3] 300px [col4] auto [col-end];
    grid-auto-rows: 90px;
    > .x__add-user {
      grid-column: 1 / span col-end;
    }
    > .x__header {
      opacity: 0.6;
      border-bottom: 2px solid #00000022;
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
      > .col4 {
        border-right: 2px solid #00000022;
        min-width: 32px;
      }
      // > .col0, > .col1, > .col2 {
      > .col0, > .col1 {
        border-right: 1px solid #00000022;
      }
      // > .col0, > .col1, > .col2, .col3, .col4 {
      > .col0, > .col1, .col3, .col4 {
        padding: 10px;
        border-bottom: 2px solid #00000022;
        display: flex;
        align-items: center;
        > * {
          vertical-align: middle;
          flex: 0 0 auto;
        }
      }
      > .x__name, .x__email {
        &.x--not-active {
          opacity: 0.6;
        }
      }
      > .x__is-active {
        justify-content: center;
        > .x__yes {
          color: green;
        }
        > .x__no {
          color: #9c3939;
        }
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
      > .x__spinner {
        > span {
          margin-left: 50px;
        }
        min-width: 85px;
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

const DialogContentsS = styled.div`
  > div {
    line-height: 2.0em;
  }
  > p, > div {
    > .x__email {
      border-bottom: 1px solid #111;
      padding: 2px;
    }
    > button {
      margin-right: 20px;
    }
    > .x__spinner {
      vertical-align: middle;
      position: relative;
      top: 5px;
      left: 15px;
    }
  }
  > .x__buttons {
    margin-top: 10px;
  }
`

const ContentsRemoveDialog = component (
  ['ContentsRemoveDialog'],
  ({ emailToRemove, }) => <DialogContentsS>
    <p>
      Gebruiker <span className='x__email'>{emailToRemove}</span> wordt onherroepelijk verwijderd.
    </p>
    <p>
      Weet je zeker dat je wil doorgaan?
    </p>
  </DialogContentsS>,
)

const ContentsMailDialog = component (
  ['ContentsMailDialog'],
  ({ emailToSend, }) => <DialogContentsS>
    <p>
      Gebruiker <span className='x__email'>{emailToSend}</span> krijgt een mail met instructies voor het kiezen van een (nieuw) wachtwoord.
    </p>
    <p>
      Weet je zeker dat je wil doorgaan?
    </p>
  </DialogContentsS>,
)

const ContentsUserAdd = container (
  [
    'UserAdd',
    { userAddDispatch: userAdd, },
    { userAddPending: selectUserAddPending, userAddSuccess: selectUserAddSuccess, },
  ],
  ({ close, onSuccess, userAddDispatch, userAddSuccess, userAddPending, }) => {
    const [firstName, setFirstName] = useState ('')
    const [lastName, setLastName] = useState ('')
    const [email, setEmail] = useState ('')
    const onChangeFirstName = useCallbackConst (
      (event) => setFirstName (event.target.value | trim),
    )
    const onChangeLastName = useCallbackConst (
      (event) => setLastName (event.target.value | trim),
    )
    const onChangeEmail = useCallbackConst (
      (event) => setEmail (event.target.value | trim),
    )
    const canSubmit = useMemo (
      () => [firstName, lastName, email] | allAgainst (isNotEmptyString),
      [firstName, lastName, email],
    )
    const doUserAdd = useCallback (
      () => userAddDispatch (email, firstName, lastName, ['user']),
      [email, firstName, lastName, userAddDispatch],
    )
    const onKeyDownInput = useCallback (
      (event) => event | keyDownListen (
        () => {
          // event.preventDefault ()
          canSubmit && doUserAdd ()
        },
        'Enter',
      ),
      [canSubmit, doUserAdd],
    )
    const onClickSubmit = useCallback (
      () => doUserAdd (),
      [doUserAdd]
    )
    useEffect (() => {
      if (userAddSuccess) onSuccess ()
    }, [userAddSuccess])

    return <DialogContentsS>
      <div>
        Voornaam <Input onChange={onChangeFirstName} onKeyDown={onKeyDownInput}/>
      </div>
      <div>
        Achternaam <Input onChange={onChangeLastName} onKeyDown={onKeyDownInput}/>
      </div>
      <div>
        E-mailadres <Input onChange={onChangeEmail} onKeyDown={onKeyDownInput}/>
      </div>
      <div className='x__buttons'>
        <Button disabled={not (canSubmit)} onClick={onClickSubmit}>
          OK
        </Button>
        <Button onClick={close}>
          Annuleer
        </Button>
        <span className='x__spinner'>
          {userAddPending && <Spinner size={20}/>}
        </span>
      </div>
    </DialogContentsS>
  },
)

const dispatchTable = {
  sendWelcomeEmailDispatch: sendWelcomeEmail,
  usersFetchDispatch: usersFetch,
  userAddStartDispatch: userAddStart,
  userRemoveDispatch: userRemove,
}

const selectorTable = {
  users: selectUsers,
  emailRequestPending: selectEmailRequestPending,
  userRemovePending: selectUserRemovePending,
  userRemovePendingUsers: selectUserRemovePendingUsers,
}

export default container (
  ['Admin', dispatchTable, selectorTable],
  (props) => {
    const {
      users,
      userRemoveDispatch,
      sendWelcomeEmailDispatch,
      usersFetchDispatch,
      userAddStartDispatch,
      userRemovePendingUsers,
      emailRequestPending,
    } = props

    // @todo get from Contents or something.
    const isMobile = false

    const [emailToRemove, setEmailToRemove] = useState (null)
    const [removeDialogIsOpen, setRemoveDialogIsOpen] = useState (false)
    const [emailToSend, setEmailToSend] = useState (null)
    const [sendMailDialogIsOpen, setSendMailDialogIsOpen] = useState (false)
    const [addUserDialogIsOpen, setAddUserDialogIsOpen] = useState (false)

    const pending = (email) => emailRequestPending.has (email) || userRemovePendingUsers.has (email)

    const navigate = useNavigate ()

    const onClickClose = useCallbackConst (() => {
      navigate ('/')
    })

    // --- Dialogs

    const openRemoveDialog = useCallbackConst (T >> setRemoveDialogIsOpen)
    const closeRemoveDialog = useCallbackConst (F >> setRemoveDialogIsOpen)
    const openSendMailDialog = useCallbackConst (T >> setSendMailDialogIsOpen)
    const closeSendMailDialog = useCallbackConst (F >> setSendMailDialogIsOpen)
    const openAddUserDialog = useCallbackConst (T >> setAddUserDialogIsOpen)
    const closeAddUserDialog = useCallbackConst (F >> setAddUserDialogIsOpen)

    const onClickRemove = useCallbackConst ((email) => {
      openRemoveDialog ()
      setEmailToRemove (email)
    })
    const onClickRemoveConfirm = useCallback (() => {
      userRemoveDispatch (emailToRemove)
      closeRemoveDialog ()
    }, [userRemoveDispatch, emailToRemove])
    const onClickRemoveCancel = useCallbackConst (() => closeRemoveDialog ())
    const onClickAddUser = useCallbackConst (() => {
      userAddStartDispatch ()
      openAddUserDialog ()
    })
    const onClickSendMail = useCallback ((email) => {
      openSendMailDialog ()
      setEmailToSend (email)
    })
    const onClickSendMailConfirm = useCallback (() => {
      closeSendMailDialog ()
      sendWelcomeEmailDispatch (emailToSend)
    }, [emailToSend, sendWelcomeEmailDispatch],)
    const onClickSendMailCancel = useCallbackConst (() => closeSendMailDialog ())
    const onUserAddSuccess = useCallbackConst (() => {
      usersFetchDispatch ()
      closeAddUserDialog ()
      toastInfo ('Het toevoegen van de nieuwe gebruiker is geslaagd, en er is een e-mail met activatielink naar de gebruiker gestuurd.')
    })

    useEffect (() => {
      usersFetchDispatch ()
    }, [usersFetchDispatch])

    useWhy ('Admin', props)
    useReduxReducer ({ createReducer, reducer, key: 'Admin', })
    useSaga ({ saga, key: 'Admin', })

    return <AdminS>
      <Dialog
        isOpen={addUserDialogIsOpen}
        onRequestClose={closeAddUserDialog}
        closeOnOverlayClick={true}
        isMobile={isMobile}
      >
        <ContentsUserAdd close={closeAddUserDialog} onSuccess={onUserAddSuccess}/>
      </Dialog>
      <AreYouSureDialog
        isMobile={isMobile}
        isOpen={removeDialogIsOpen}
        closeOnOverlayClick={true}
        onRequestClose={closeRemoveDialog}
        onYes={onClickRemoveConfirm}
        onNo={onClickRemoveCancel}
        Contents={ContentsRemoveDialog}
        contentsProps={{ emailToRemove, }}
      />
      <AreYouSureDialog
        isMobile={isMobile}
        isOpen={sendMailDialogIsOpen}
        closeOnOverlayClick={true}
        onRequestClose={closeSendMailDialog}
        onYes={onClickSendMailConfirm}
        onNo={onClickSendMailCancel}
        Contents={ContentsMailDialog}
        contentsProps={{ emailToSend, }}
      />
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
            <div className='x__add-user'>
              <MenuItem
                onClick={onClickAddUser}
                imgSrc={iconAdd}
                text='Gebruiker toevoegen'
                size='page'
              />
            </div>
            <div className='col0 x__header'>
              Naam
            </div>
            <div className='col1 x__header'>
              E-mailadres
            </div>
            <div className='col2 x__header'>
              {/*Geactiveerd*/}
            </div>
            <div className='col3 x__header'/>
            <div className='col4 x__header'/>
            {data | map (({ email, firstName, lastName, isActive, }) => <div className='data-row' key={email}>
              <div className={clss ('col0', 'x__name', isActive || 'x--not-active')}>
                {firstName} {lastName}
              </div>
              <div className={clss ('col1', 'x__email', isActive || 'x--not-active')}>
                {email}
              </div>
              <div className='col2 x__is-active'>
                {/* isActive ? <span className='x__yes'>✔</span> : <span className='x__no'>✘</span> */}
              </div>
              <div className='col3 x__buttons'>
                <div className='x__buttons-flex'>
                  <MenuItem
                    onClick={() => onClickSendMail (email)}
                    text='welkomst e-mail opnieuw versturen'
                    imgSrc={iconUpdate}
                  />
                  <MenuItem
                    onClick={() => onClickRemove (email)}
                    text='gebruiker verwijderen'
                    imgSrc={iconRemove}
                  />
                </div>
              </div>
              <div className='col4 x__spinner'>
                <span>
                  {pending (email) && <Spinner size={20}/>}
                </span>
              </div>
            </div>
            )}
          </>
        })}
      </div>
    </AdminS>
  }
)
