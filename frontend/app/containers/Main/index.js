import {
  pipe, compose, composeRight,
  not, allAgainst, noop,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { keyPressListen, } from 'alleycat-js/es/dom'
import { logWith, } from 'alleycat-js/es/general'
import {} from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useSaga, } from 'alleycat-js/es/redux-hooks'

import {
  dataFetch,
  login,
  logout,
} from '../App/actions/main'

import {
  selectData,
} from '../App/store/domain/selectors'

import {
  selectLoggedIn,
  selectFirstName,
} from '../App/store/app/selectors'

import saga from './saga'

import { Button, } from '../../components/shared'

import { container, isNotEmptyString, useWhy, mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth, requestResults, } from '../../common'
import config from '../../config'

const configTop = configure.init (config)
const iconShowPasswordHidden = configTop.get ('icons.show-password-hidden')
const iconShowPasswordShown = configTop.get ('icons.show-password-shown')

const MainS = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 25px;
  justify-content: center;
  align-items: center;
  font-size: 25px;
  input {
    border: 1px solid #00000088;
    padding: 10px;
  }
  .x__login {
    input {
      height: 100%;
    }
    font-size: 20px;
    display: grid;
    grid-template-columns: 117px auto 24px;
    grid-auto-rows: 50px;
    row-gap: 10px;
    column-gap: 10px;
    .x__label, .x__icon {
      display: inline-block;
      position: relative;
      top: 50%;
      height: 35px;
      transform: translateY(-50%);
    }
    .x__input {
    }
  }
`

const dispatchTable = {
  dataFetchDispatch: dataFetch,
  loginDispatch: login,
  logoutDispatch: logout,
}

const selectorTable = {
  data: selectData,
  loggedIn: selectLoggedIn,
  firstName: selectFirstName,
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

export default container (
  ['Main', dispatchTable, selectorTable],
  (props) => {
    const {
      isMobile,
      data, loggedIn, firstName,
      dataFetchDispatch, loginDispatch, logoutDispatch,
    } = props

    const [email, setEmail] = useState ('')
    const [password, setPassword] = useState ('')
    const [showPassword, setShowPassword] = useState (false)

    const canLogIn = useMemo (
      () => [email, password] | allAgainst (isNotEmptyString),
      [email, password],
    )

    const onClickButton = useCallbackConst (() => {
      dataFetchDispatch ()
    })

    const login = useCallback (
      () => loginDispatch (email, password),
      [email, password, loginDispatch],
    )

    const onClickLogin = login

    const onClickLogout = useCallbackConst (
      () => logoutDispatch ()
    )

    const onClickShowPassword = useCallbackConst (
      () => setShowPassword (not),
    )

    const onChangeEmail = useCallbackConst (
      (event) => setEmail (event.target.value),
    )

    const onChangePassword = useCallbackConst (
      (event) => setPassword (event.target.value),
    )

    const onKeyPressInput = useCallback (
      (event) => event | keyPressListen (
        () => {
          event.preventDefault ()
          login ()
        },
        'Enter',
      ),
      [login],
    )

    useWhy ('Main', props)
    useSaga ({ saga, key: 'Main', })

    return <MainS>
      {loggedIn && <div>
        <div>welkom, {firstName}</div>
        <div>data is: {data}</div>
        <BigButton onClick={onClickButton}>get data</BigButton>
        <BigButton onClick={onClickLogout}>log out</BigButton>
      </div>}
      {/* --- the form is there to silence a chromium warning, but doesn't really do anything; make sure to use event.preventDefault so it doesn't submit */}
      {loggedIn || <form>
        <div className='x__login'>
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
          <BigButton disabled={not (canLogIn)} onClick={onClickLogin}>log in</BigButton>
        </div>
        </div>
      </form>}
    </MainS>
  }
)
