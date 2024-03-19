import {
  pipe, compose, composeRight,
  not, allAgainst, noop, ifTrue,
  map, path, condS, eq, guard, otherwise,
  lets, id, die,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import { Link, useNavigate, } from 'react-router-dom'
import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, keyPressListen, } from 'alleycat-js/es/dom'
import { logWith, } from 'alleycat-js/es/general'
import { ifEquals, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useSaga, } from 'alleycat-js/es/redux-hooks'

import {
  logIn,
  logOut,
  passwordUpdate,
} from '../App/actions/main'

import {
  selectInstitutionLoggedIn,
  selectUserLoggedIn,
  selectGetFirstName, selectGetLastName, selectGetEmail,
  selectGetContactEmail, selectGetInstitutionName,
  selectGetUserType,
} from '../App/store/app/selectors'
import {
  selectFondsen,
} from '../App/store/domain/selectors'

import saga from './saga'

import FondsDetail from '../FondsDetail'
import {} from '../../alleycat-components'
import { Button, } from '../../components/shared'
import { Input, } from '../../components/shared/Input'
import { mkPagination, } from '../../components/shared/Pagination'

import { component, container, isNotEmptyString, keyDownListen, useWhy, mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth, requestResults, } from '../../common'
import config from '../../config'

// import data from '../../../../__data/fb-data-tst.json'

const configTop = configure.init (config)
const iconLogout = configTop.get ('icons.logout')
const iconUpdate = configTop.get ('icons.update')
const iconShowPasswordHidden = configTop.get ('icons.show-password-hidden')
const iconShowPasswordShown = configTop.get ('icons.show-password-shown')
const iconUser = configTop.get ('icons.user')
const imageHoutenFrame = configTop.get ('images.fonds')
const imageLogo = configTop.get ('images.logo')
const imageBackground = configTop.get ('images.background')
// const imageUitgave = configTop.get ('images.uitgave')

const imageFonds = imageHoutenFrame

// --- pinkish
const colorHighlight = '#ffdbdbdd'

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
    text-wrap: nowrap;
    right: 0px;
    top: 50px;
    cursor: default;
    box-shadow: 1px 1px 4px;
    hr {
      margin-top: 20px;
      width: 50%;
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
      // @todo x__logout and x__passwordUpdate are repeated
      > .x__logout {
        cursor: pointer;
        > * {
          vertical-align: middle;
        }
        > img {
          margin-right: 13px;
        }
      }
      .x__passwordUpdate {
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

const UserinfoInstitutionS = styled.div`
  font-weight: 200;
  > .x__institution-name {
  }
  > .x__contact-email {
  }
  > .x__institution-name, > .x__contact-email {
    text-wrap: nowrap;
    overflow-x: hidden;
    text-overflow: ellipsis;
  }
  .x__log-in {
    .x__icon {
      margin-right: 12px;
      padding: 3px;
      border: 3px solid #999999;
      border-radius: 2000px;
    }
    .x__text {
      cursor: pointer;
      &:hover {
        text-decoration: underline;
      }
    }
  }
`

const UserinfoInstitution = container (
  ['UserinfoInstitution', {}, {
    getContactEmail: selectGetContactEmail,
    getInstitutionName: selectGetInstitutionName,
  }],
  ({ getContactEmail, getInstitutionName, onNavigate, }) => {
    const navigate = useNavigate ()
    const onClickLogIn = useCallback (
      () => {
        navigate ('/login')
        onNavigate ()
      },
      [navigate, onNavigate],
    )
    return <UserinfoInstitutionS>
      <div className='x__institution-name'>
        Je bent ingelogd courtesy of: {getInstitutionName ()}
      </div>
      <div className='x__contact-email'>
        Contact: {getContactEmail ()}
      </div>
      <div className='x__log-in'>
        <span className='x__icon'>
          ⴙ
        </span>
        <span className='x__text' onClick={onClickLogIn}>
          log in met gebruikersnaam en wachtwoord
        </span>
      </div>
    </UserinfoInstitutionS>
  },
)

const UserinfoUserS = styled.div`
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
`

const UserinfoUser = container (
  ['UserinfoUser', {}, {
    getEmail: selectGetEmail,
    getFirstName: selectGetFirstName,
    getLastName: selectGetLastName,
  }],
  ({ getFirstName, getLastName, getEmail, }) => <UserinfoInstitutionS>
    <div className='x__name'>
      {getFirstName ()} {getLastName ()}
    </div>
    <div className='x__email'>
      {getEmail ()}
    </div>
  </UserinfoInstitutionS>,
)

const User = container (
  ['User', { logOutDispatch: logOut, }, { getUserType: selectGetUserType,}],
  ({ getUserType, logOutDispatch, }) => {
    const navigate = useNavigate ()

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
    const onClickPasswordUpdate = useCallback (
      () => {
        setOpen (false)
        navigate ('/user')},
     [navigate])
    const onNavigate = useCallbackConst (
      () => setOpen (not),
    )

    return <UserS tabIndex={-1} onBlur={onBlur}>
      <img src={iconUser} height='40px' onClick={onClick}/>
      {open && <div className='x__contents'>
        {getUserType () | condS ([
          eq ('institution') | guard (() => <UserinfoInstitution onNavigate={onNavigate}/>),
          eq ('user') | guard (() => <>
            <UserinfoUser/>
            <hr/>
            <div className='x__menu-items'>
              <div className='x__item x__logout' onClick={onClickLogout}>
                <img src={iconLogout} width='18px'/>
                <span className='x__text'>afmelden</span>
              </div>
              <div onClick={onClickPasswordUpdate} className='x__item x__passwordUpdate'>
                <img src={iconUpdate} width='18px'/>
                <span className='x__text'>wachtwoord veranderen</span>
              </div>
            </div>
          </>),
          otherwise | guard (() => null),
        ])}
      </div>}
    </UserS>
  },
)

const HeaderS = styled.div`
  height: 100px;
  background: #FFFFFF66;
  backdrop-filter: blur(5px);
  border-bottom: 2px solid black;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  .x__logo {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 350px;
  }
  .x__menu {
    flex: 0 0 auto;
    margin-right: 30px;
    z-index: 20;
  }
`

const Header = ({ isLoggedIn, }) => <HeaderS>
  <div className='x__menu'>
    {isLoggedIn && <User/>}
  </div>
  {/*
  <div className='x__logo'>
    <Logo/>
  </div>
  */}
</HeaderS>

const LogoS = styled.div`
  img {
    width: 100%;
  }
  a {
    text-decoration: none;
    color: inherit;
  }
`

const Logo = () => <LogoS>
  <Link to='/'>
    <img src={imageLogo}/>
  </Link>
</LogoS>

const MainS = styled.div`
  background: url(${imageBackground});
  background-size: 100%;
  height: 100%;
  font-size: 20px;
  font-family: Arial;
  > .x__contents {
    height: 100%;
    display: flex;
    flex-direction: column;
    > .x__header {
      flex: 0 0 auto;
      z-index: 2;
    }
    > .x__logo {
      padding: 5px;
      width: 350px;
      margin: auto;
      margin-bottom: 40px;
      cursor: pointer;
    }
  }
  // > .x__login-wrapper {
  // }
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
`

const FormWrapper = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`

const Form = styled.div`
  padding: 35px;
  border: 1px solid black;
  border-radius: 10px;
  background: ${colorHighlight};

  font-size: 20px;
  display: grid;
  grid-template-columns: 117px auto 24px;
  grid-auto-rows: 50px;
  row-gap: 40px;
  column-gap: 20px;
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
    background: white;
  }
  x__text {
    width: 400px;
    padding: 20px;
  }
`

const LoginInner = component (
  ['LoginInner'],
  ({ logIn, }) => {
    const [email, setEmail] = useState ('')
    const [password, setPassword] = useState ('')
    const [showPassword, setShowPassword] = useState (false)

    const inputEmailRef = useRef (null)
    const inputPasswordRef = useRef (null)

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
          canLogIn && doLogIn ()
        },
        'Enter',
      ),
      [doLogIn, canLogIn],
    )

    useEffect (() => {
      // console.log ('inputEmailRef.current.value', inputEmailRef.current.value)
      // console.log ('inputEmailRef.current', inputEmailRef.current)
      setEmail (inputEmailRef.current.value)
    }, [])

    const canLogIn = useMemo (
      () => [email, password] | allAgainst (isNotEmptyString),
      [email, password],
    )

    // --- the outer element is a form, which is there to silence a chromium warning, but doesn't really do anything.
    // Make sure to use event.preventDefault so it doesn't submit

    return <LoginS>
      <Form>
        {/* --- the form is there to silence a chromium warning, but doesn't really do anything; make sure to use event.preventDefault so it doesn't submit */}
        <div className='x__label x__email'>
          emailadres
        </div>
        <div className='x__input x__email-input'>
          <input type='text' autoComplete='username' onChange={onChangeEmail} onKeyPress={onKeyPressInput} ref={inputEmailRef}/>
        </div>
        <div/>
        <div className='x__label x__password'>
          wachtwoord
        </div>
        <div className='x__input x__password-input'>
          <input type={showPassword ? 'text' : 'password'} autoComplete='current-password' onChange={onChangePassword} onKeyPress={onKeyPressInput} ref={inputPasswordRef}/>
        </div>
        <div className='x__icon'>
          <IconShowPassword shown={showPassword} onClick={onClickShowPassword}/>
        </div>
        <div/>
        <div>
          <BigButton disabled={not (canLogIn)} onClick={onClickLogIn}>aanmelden</BigButton>
        </div>
      </Form>
    </LoginS>
  },
)

const Login = container ([
  'Login', { logInDispatch: logIn, }, {},
], ({ logInDispatch, }) => <FormWrapper>
  <LoginInner logIn={logInDispatch}/>
</FormWrapper>
)

const SidebarS = styled.div`
  height: 100%;
  width: 100%;
  padding: 20px;
  background: #FFFFFF66;
  backdrop-filter: blur(5px);
`

const Sidebar = () => <SidebarS>
  sidebar (filters etc.)
  <p>dit is de {process.env.APP_ENV} omgeving</p>
</SidebarS>

const FondsS = styled.div`
  display: inline-block;
  height: 500px;
  // background: #aaaa66ff;
  background: ${colorHighlight};
  vertical-align: top;
  width: 350px;
  margin: 3px;
  margin-right: 50px;
  margin-bottom: 50px;
  border: 10px solid #222222;
  border-radius: 20px;
  a {
    color: inherit;
    display: block;
  }
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
      font-size: 30px;
    }
    .x__categories {
      margin-top: 20px;
      font-size: 95%;
      line-height: 1.3em;
    }
  }
`

const Fonds = ({ uuid, naam_organisatie, categories, website, }) => {
  const href = '/detail/' + uuid
  return <FondsS>
    <Link to={href}>
      <div className='x__img'>
        <img src={imageFonds}/>
      </div>
    </Link>
      <div className='x__text'>
        <div className='x__naam-organisatie'>
          <Link to={website}>
            {naam_organisatie}
          </Link>
        </div>
        <div className='x__categories'>
          {categories | map ((category) => <div key={category} className='x__category'>
            {category}
          </div>)}
        </div>
      </div>
  </FondsS>
}

const FondsenS = styled.div`
  // background: #ffffbb66;
  text-align: center;
  min-width: 100px;
`

const Fondsen = container (
  ['Fondsen', {}, { fondsen: selectFondsen, }],
  ({ fondsen, }) => <FondsenS>
    {fondsen | requestResults ({
      onError: noop,
      onResults: map (
        ({ uuid, naam_organisatie, categories, website, ... _rest }) => {
          return <Fonds
            key={uuid} uuid={uuid} naam_organisatie={naam_organisatie} categories={categories}
            website={website}
          />
        },
      ),
    })}
  </FondsenS>,
)

const UserPage = container (
  ['UserPage',
    { passwordUpdateDispatch: passwordUpdate, },
    { getEmail: selectGetEmail, }
  ],
  ({ passwordUpdateDispatch, getEmail, }) => {
    const email = "test@email.com"
    const [oldPassword, setOldPassword] = useState ('')
    const [newPassword, setNewPassword] = useState ('')
    const [showPassword, setShowPassword] = useState (false)

    const inputOldPasswordRef = useRef (null)
    const inputNewPasswordRef = useRef (null)

    const onChangeOldPassword = useCallbackConst (
      (event) => setOldPassword (event.target.value),
    )

    const onChangeNewPassword = useCallbackConst (
      (event) => setNewPassword (event.target.value),
    )

    const onClickShowPassword = useCallbackConst (
      () => setShowPassword (not),
    )

    const doPasswordUpdate = useCallback (
      () => lets (
        () => getEmail (),
        (email) => passwordUpdateDispatch (email, oldPassword, newPassword),
      ),
      [getEmail, oldPassword, newPassword],
    )

    const onKeyDownInput = useCallback (
      keyDownListen (
        () => {
          event.preventDefault ()
          canUpdatePassword && doPasswordUpdate ()
        },
        'Enter',
      ),
      [doPasswordUpdate, canUpdatePassword],
    )

    const onClickPasswordUpdate = () => doPasswordUpdate ()

    const canUpdatePassword = useMemo (
      () => [oldPassword, newPassword] | allAgainst (isNotEmptyString),
      [oldPassword, newPassword],
    )

    return <FormWrapper>
      <Form style={{ marginTop: '-20%', }}>
        <div className='x__label x__password'>
          oud wachtwoord
        </div>
        <div className='x__input x__password-input'>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete='current-password'
            onChange={onChangeOldPassword}
            onKeyDown={onKeyDownInput}
            ref={inputOldPasswordRef}/>
        </div>
        <div className='x__icon'>
          <IconShowPassword shown={showPassword} onClick={onClickShowPassword}/>
        </div>
        <div className='x__label x__new-password'>
          nieuw wachtwoord
        </div>
        <div className='x__input x__new-password-input'>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete='new-password'
            onChange={onChangeNewPassword}
            onKeyDown={onKeyDownInput}
            ref={inputNewPasswordRef}/>
        </div>
        <div/>
        <div/>
        <div>
          <BigButton disabled={not (canUpdatePassword)} onClick={onClickPasswordUpdate}>versturen</BigButton>
        </div>
      </Form>
    </FormWrapper>
  }
)

const targetValue = path (['target', 'value'])

const SearchS = styled.div`
  > * {
    vertical-align: middle;
  }
  > .x__text {
    margin-left: 20px;
    &.x--disabled {
      opacity: 0.6;
    }
  }
`

const Search = component (
  ['Search'],
  () => {
    const [string, setString] = useState ('')
    const onChange = useCallbackConst (setString << targetValue)
    const canSearch = useMemo (() => string | isNotEmptyString, [string])
    const cls = clss ('x__text', canSearch || 'x--disabled')
    return <SearchS>
      <Input
        withIcon={['search', 'left']}
        height='100%'
        width='50%'
        padding='16px'
        style={{ display: 'inline-block', }}
        inputStyle={{
          fontSize: '25px',
          border: '2px solid black',
          borderRadius: '1000px',
          background: 'white',
        }}
        onChange={onChange}
        value={string}
      />
      <span className={cls}>zoeken</span>
    </SearchS>
  },
)

const FondsMainS = styled.div`
  margin-top: 50px;
  display: flex;
  flex-direction: column;
  width: 100%;
  > .x__search {
    flex: 0 0 120px;
    text-align: center;
    margin-bottom: 50px;
  }
  > .x__main {
    // --- @todo
    flex: 0 0 calc(100vh - 120px);
    // overflow-y: auto;
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
  overflow-y: scroll;
  display: flex;
  width: 100vw;
  .x__sidebar {
    flex: 0 0 300px;
  }
  .x__main {
    // --- @todo
    flex: 1 0 calc(100vw - 300px);
    > .x__logo {
      margin-top: 50px;
      position: relative;
      left: 50%;
      transform: translateX(-50%);
      width: 450px;
    }
  }
`

const Contents = container (
  ['Contents', {}, {}],
  ({ page, }) => {

    const [showSidebar, element] = page | condS ([
      eq ('overview') | guard (() => [true, () => <FondsMain/>]),
      eq ('detail') | guard (() => [false, () => <FondsDetail/>]),
      eq ('login') | guard (() => [false, () => <Login/>]),
      eq ('user') | guard (() => [true, () => <UserPage/>]),
      otherwise | guard (() => die ('Invalid page ' + page)),
    ])

    return <ContentsS>
      {showSidebar && <div className='x__sidebar'>
        <Sidebar/>
      </div>}
      <div className='x__main'>
        <div className='x__logo'>
          <Logo/>
        </div>
        {element ()}
      </div>
    </ContentsS>
  },
)

export default container (
  ['Main', {}, {
    institutionLoggedIn: selectInstitutionLoggedIn,
    userLoggedIn: selectUserLoggedIn,
    getUserType: selectGetUserType,
  }],
  (props) => {
    const { isMobile, page, institutionLoggedIn, userLoggedIn, getUserType, } = props
    const navigate = useNavigate ()

    useWhy ('Main', props)
    useSaga ({ saga, key: 'Main', })

    const fold = requestResults ({
      onError: noop,
      onResults: id,
      onLoading: noop,
    })

    const isInstitutionLoggedIn = institutionLoggedIn | fold
    const isUserLoggedIn = userLoggedIn | fold
    const isLoggedIn = isInstitutionLoggedIn || isUserLoggedIn

    useEffect (() => {
      if (not (isLoggedIn)) return navigate ('/login')
      if (isUserLoggedIn && page === 'login') return navigate ('/')
    }, [isLoggedIn, isUserLoggedIn, getUserType, page, navigate])

    return <MainS tabIndex={-1}>
      <div className='x__contents'>
        <div className='x__header'>
          <Header isLoggedIn={isLoggedIn}/>
        </div>
        {true && <Contents page={page}/>}
      </div>
    </MainS>
  },
)
