import {
  pipe, compose, composeRight,
  not, allAgainst, noop, ifTrue,
  map, path, condS, eq, guard, otherwise,
  nil,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, keyPressListen, } from 'alleycat-js/es/dom'
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
import {
  selectFondsen,
} from '../App/store/domain/selectors'

import saga from './saga'

import FondsDetail from '../FondsDetail'
import { spinner, } from '../../alleycat-components'
import { Button, LinkLike, } from '../../components/shared'
import { Input, } from '../../components/shared/Input'

import { component, container, isNotEmptyString, useWhy, mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth, requestResults, } from '../../common'
import config from '../../config'

// import data from '../../../../__data/fb-data-tst.json'

const configTop = configure.init (config)
const iconLogout = configTop.get ('icons.logout')
const iconShowPasswordHidden = configTop.get ('icons.show-password-hidden')
const iconShowPasswordShown = configTop.get ('icons.show-password-shown')
const iconUser = configTop.get ('icons.user')
const imageGracht = configTop.get ('images.gracht')

const UserS = styled.div`
  width: 50px;
  cursor: pointer;
  position: relative;
  > .x__contents {
    background: #FBFBFB;
    border: 1px solid #999999;
    position: absolute;
    font-size: 18px;
    padding: 15px;
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
      > .x__item {
        &:hover > .x__text {
          border-bottom: 2px solid #00000099;
        }
        .x__text {
          padding-bottom: 5px;
        }
      }
      > .x__logout {
        cursor: pointer;
        > * {
          vertical-align: middle;
        }
        > img {
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
          <div className='x__item x__logout' onClick={onClickLogout}>
            <img src={iconLogout} width='18px'/>
            <span className='x__text'>afmelden</span>
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
  font-size: 20px;
  font-family: Arial;
  > .x__contents {
    height: 100%;
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

const SidebarS = styled.div`
  height: 100%;
  width: 100%;
  border-right: 1px solid black;
  padding: 20px;
`

const Sidebar = () => <SidebarS>
  sidebar (filters etc.)
  <p>dit is de {process.env.APP_ENV} omgeving</p>
</SidebarS>

const FondsS = styled.div`
  display: inline-block;
  height: 500px;
  background: #ffffbb66;
  vertical-align: top;
  width: 200px;
  margin: 3px;
  margin-right: 20px;
  border: 1px solid black;
  margin-bottom: 20px;
  line-height: 1.5em;
  .x__img {
    width: 100%;
    img {
      width: 100%;
    }
  }
  .x__text {
    padding: 10px;
    > .x__naam-organisatie {
      text-decoration: underline;
    }
    .x__categorie {
      margin-top: 20px;
      font-size: 95%;
      line-height: 1.3em;
    }
  }
`

const Fonds = ({ naam_organisatie, categorie, }) => <FondsS>
  <div className='x__img'>
    <img src={imageGracht}/>
  </div>
  <div className='x__text'>
    <div className='x__naam-organisatie'>
      {naam_organisatie}
    </div>
    <div className='x__categorie'>
      {categorie}
    </div>
  </div>
</FondsS>

const FondsenS = styled.div`
  text-align: center;
  min-width: 100px;
`

const Fondsen = container (
  ['Fondsen', {}, { fondsen: selectFondsen, }],
  ({ fondsen, }) => <FondsenS>
    {fondsen | requestResults ({
      onError: noop,
      onResults: map (
        ({ uuid, naam_organisatie, categorie, ... _rest }) => {
          return <Fonds key={uuid} naam_organisatie={naam_organisatie} categorie={categorie}/>
        },
      ),
    })}
  </FondsenS>,
)

const targetValue = path (['target', 'value'])
const Search = component (
  ['Search'],
  () => {
    const [string, setString] = useState ('')
    const onChange = useCallbackConst (setString << targetValue)
    const canSearch = useMemo (() => string | isNotEmptyString, [string])
    const cls = clss ('x__text', canSearch || 'x--disabled')
    return <>
      <Input
        withIcon={['search', 'left']}
        height='100%'
        width='30%'
        padding='8px'
        style={{ display: 'inline-block', }}
        inputStyle={{
          fontSize: '25px',
          border: '2px solid black',
          borderRadius: '1000px',
        }}
        onChange={onChange}
        value={string}
      />
      <span className={cls}>zoeken</span>
    </>
  },
)

const FondsMainS = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  > .x__search {
    flex: 0 0 120px;
    text-align: center;
    margin-bottom: 50px;
    > * {
      vertical-align: middle;
    }
    > .x__text {
      margin-left: 20px;
      &.x--disabled {
        opacity: 0.6;
      }
    }
  }
  > .x__main {
    // --- @todo
    flex: 0 0 calc(100vh - 120px);
    overflow-y: auto;
    margin: auto;
  }
`

const FondsMain = () => {
  return <FondsMainS>
    <div className='x__search'>
      <Search/>
    </div>
    <div className='x__main'>
      <Fondsen/>
    </div>
  </FondsMainS>
}

const ContentsS = styled.div`
  height: 100%;
  display: flex;
  width: 100vw;
  .x__sidebar {
    flex: 0 0 300px;
  }
  .x__main {
    // --- @todo
    flex: 1 0 calc(100vw - 300px);
  }
`

const Contents = container (
  ['Contents', {}, {}],
  ({ page, }) => <ContentsS>
    <div className='x__sidebar'>
      <Sidebar/>
    </div>
    <div className='x__main'>
      {page | condS ([
        eq ('overview') | guard (() => <FondsMain/>),
        eq ('detail') | guard (() => <FondsDetail/>),
        otherwise | guard (() => 'Invalid page ' + page),
      ])}
    </div>
  </ContentsS>,
)

const Spinner = spinner ('comet')

export default container (
  ['Main', { logInDispatch: logIn, }, { loggedIn: selectLoggedIn, }],
  (props) => {
    const { isMobile, loggedIn, logInDispatch, page, } = props
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
            <Contents page={page}/>
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
