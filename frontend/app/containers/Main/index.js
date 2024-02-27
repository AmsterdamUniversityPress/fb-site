import {
  pipe, compose, composeRight,
  not, allAgainst, noop, ifTrue,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { keyPressListen, } from 'alleycat-js/es/dom'
import { foldIfRequestResults, } from 'alleycat-js/es/fetch'
import { logWith, } from 'alleycat-js/es/general'
import {} from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useSaga, } from 'alleycat-js/es/redux-hooks'

import {
  logIn,
  logOut,
} from '../App/actions/main'

import {
  selectLoggedIn,
  selectGetFirstName, selectGetLastName, selectGetEmail,
} from '../App/store/app/selectors'

import saga from './saga'

import { spinner, } from '../../alleycat-components'
import { Button, LinkLike, } from '../../components/shared'

import { component, container, isNotEmptyString, useWhy, mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth, requestResults, } from '../../common'
import config from '../../config'

const configTop = configure.init (config)
const iconLogout = configTop.get ('icons.logout')
const iconShowPasswordHidden = configTop.get ('icons.show-password-hidden')
const iconShowPasswordShown = configTop.get ('icons.show-password-shown')
const iconUser = configTop.get ('icons.user')

const UserS = styled.div`
  width: 50px;
  cursor: pointer;
  position: relative;
  > .x__contents {
    border: 1px solid #999999;
    position: absolute;
    font-size: 18px;
    padding: 10px;
    width: 200px;
    left: -150px;
    top: 50px;
    cursor: default;
    box-shadow: 1px 1px 4px;
    hr {
      margin-top: 20px;
      width: 50%;
    }
    > .x__userinfo {
      font-weight: 200;
      > .x__name {
      }
      > .x__email {
      }
      > .x__name, > .x__email {
        text-wrap: nowrap;
        overflow-x: hidden;
        text-overflow: ellipsis;
      }
    }
    > .x__menu-items {
      margin-top: 12px;
      > .x__logout {
        cursor: pointer;
        img {
          margin-right: 13px;
        }
      }
    }
  }
`

const User = container (
  [
    'User', {
      logOutDispatch: logOut,
    }, {
      getEmail: selectGetEmail,
      getFirstName: selectGetFirstName,
      getLastName: selectGetLastName,
    },
  ],
  ({ getEmail, getFirstName, getLastName, logOutDispatch, }) => {
    const [open, setOpen] = useState (false)
    const onBlur = useCallbackConst (
      () => setOpen (false),
    )
    const onClick = useCallbackConst (
      () => setOpen (not),
    )
    const onClickLogout = useCallbackConst (
      () => logOutDispatch (),
    )
    return <UserS tabIndex={-1} onBlur={onBlur}>
      <img src={iconUser} height='40px' onClick={onClick}/>
      {open && <div className='x__contents'>
        <div className='x__userinfo'>
          <div className='x__name'>
            {getFirstName ()} {getLastName ()}
          </div>
          <div className='x__email'>
            {getEmail ()}
          </div>
        </div>
        <hr/>
        <div className='x__menu-items'>
          <div className='x__logout' onClick={onClickLogout}>
            <img src={iconLogout} width='14px'/>
            afmelden
            {/* <LinkLike>afmelden</LinkLike> */}
          </div>
        </div>
      </div>}
    </UserS>
  },
)

const HeaderS = styled.div`
  height: 50px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  .x__menu {
    flex: 0 0 auto;
  }
`

const Header = () => <HeaderS>
  <div className='x__menu'>
    <User/>
  </div>
</HeaderS>

const MainS = styled.div`
  height: 100%;
  font-size: 25px;
  > .x__contents {
    display: flex;
    flex-direction: column;
    > .x__header {
      flex: 0 0 auto;
    }
  }
  > .x__login-wrapper {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    > .x__login {
    }
  }
`

const dispatchTable = {
  logInDispatch: logIn,
}

const selectorTable = {
  loggedIn: selectLoggedIn,
}

const BigButton = ({ children, ... restProps }) => <Button
  style={{ padding: '10px', }}
  {... restProps}
>
  {children}
</Button>

const IconShowPasswordS = styled.div`
  cursor: pointer;
`

const IconShowPassword = ({ shown=false, height=24, className='', onClick=noop, }) => <IconShowPasswordS onClick={onClick}>
  <img src={shown ? iconShowPasswordShown : iconShowPasswordHidden} height={height} className={className}/>
</IconShowPasswordS>

const LoginS = styled.form`
  font-size: 20px;
  display: grid;
  grid-template-columns: 117px auto 24px;
  grid-auto-rows: 50px;
  row-gap: 10px;
  column-gap: 10px;
  input {
    height: 100%;
    border: 1px solid #999999;
    padding: 10px;
  }
  .x__label, .x__icon {
    display: inline-block;
    position: relative;
    top: 50%;
    height: 35px;
    transform: translateY(-50%);
  }
  .x__input {
  }
`

const Login = component (
  ['Login'],
  ({ logIn, }) => {
    const [email, setEmail] = useState ('')
    const [password, setPassword] = useState ('')
    const [showPassword, setShowPassword] = useState (false)

    const onChangeEmail = useCallbackConst (
      (event) => setEmail (event.target.value),
    )

    const onChangePassword = useCallbackConst (
      (event) => setPassword (event.target.value),
    )

    const onClickShowPassword = useCallbackConst (
      () => setShowPassword (not),
    )

    const doLogIn = useCallback (
      () => logIn (email, password),
      [email, password, logIn],
    )

    const onClickLogIn = () => doLogIn ()

    const onKeyPressInput = useCallback (
      (event) => event | keyPressListen (
        () => {
          event.preventDefault ()
          doLogIn ()
        },
        'Enter',
      ),
      [doLogIn],
    )

    const canLogIn = useMemo (
      () => [email, password] | allAgainst (isNotEmptyString),
      [email, password],
    )

    // --- the outer element is a form, which is there to silence a chromium warning, but doesn't really do anything.
    // Make sure to use event.preventDefault so it doesn't submit

    return <LoginS>
      {/* --- the form is there to silence a chromium warning, but doesn't really do anything; make sure to use event.preventDefault so it doesn't submit */}
      <div className='x__label x__email'>
        emailadres
      </div>
      <div className='x__input x__email-input'>
        <input type='text' autoComplete='username' onChange={onChangeEmail} onKeyPress={onKeyPressInput}/>
      </div>
      <div/>
      <div className='x__label x__password'>
        wachtwoord
      </div>
      <div className='x__input x__password-input'>
        <input type={showPassword ? 'text' : 'password'} autoComplete='current-password' onChange={onChangePassword} onKeyPress={onKeyPressInput}/>
      </div>
      <div className='x__icon'>
        <IconShowPassword shown={showPassword} onClick={onClickShowPassword}/>
      </div>
      <div/>
      <div>
        <BigButton disabled={not (canLogIn)} onClick={onClickLogIn}>aanmelden</BigButton>
      </div>
    </LoginS>
  },
)

const ContentsS = styled.div`
`

const Contents = container (
  ['Contents', {}, {}],
  ({}) => <ContentsS>
    contents
  </ContentsS>,
)

const Spinner = spinner ('comet')

export default container (
  ['Main', dispatchTable, selectorTable],
  (props) => {
    const { isMobile, loggedIn, logInDispatch, } = props

    const logIn = useCallback (
      (email, password) => logInDispatch (email, password),
      [logInDispatch],
    )

    useWhy ('Main', props)
    useSaga ({ saga, key: 'Main', })

    return <MainS tabIndex={-1}>
      {loggedIn | requestResults ({
        onError: noop,
        onResults: ifTrue (
          () => <div className='x__contents'>
            <div className='x__header'>
              <Header/>
            </div>
            <Contents/>
          </div>,
          () => <div className='x__login-wrapper'>
            <div className='x__wrapper'>
              <Login logIn={logIn}/>
            </div>
          </div>,
        ),
      })}
    </MainS>
  },
)
