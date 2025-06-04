import {
  pipe, compose, composeRight,
  gt, gte, nil,
  not, noop, ifTrue, ifFalse,
  condS, guard, otherwise,
  lets, whenTrue, invoke, prop,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import { useNavigate, useParams, } from 'react-router-dom'
import { useDispatch, useSelector, } from 'react-redux'
import styled from 'styled-components'
import zxcvbn from 'zxcvbn'

import configure from 'alleycat-js/es/configure'
import { clss, keyDownListenPreventDefault, } from 'alleycat-js/es/dom'
import { requestIsPending, } from 'alleycat-js/es/fetch'
import { iwarn, logWith, setTimeoutOn, } from 'alleycat-js/es/general'
import { all, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'
import { useSaga, } from 'alleycat-js/es/redux-hooks'

import {
  logIn,
  logOut,
  passwordUpdate,
  passwordUpdateDone,
  resetPassword,
  sendResetEmail,
} from '../App/actions/main'

import { searchFetch, searchReset, } from '../Search/actions'

import {
  selectEmailRequestPending,
  selectEmailRequestSuccess,
  selectLoggedIn,
  selectLandingDecision,
  selectGetFirstName, selectGetLastName, selectGetEmail,
  selectGetContactEmail, selectGetInstitutionName,
  selectGetUserType,
  selectHasPrivilegeAdminUser,
} from '../App/store/app/selectors'
import {
  selectPasswordUpdated,
  selectPasswordUpdatedResolved,
  selectPasswordReset,
} from '../App/store/ui/selectors'

import saga from './saga'

import FondsDetail from '../FondsDetail'
import Admin from '../Admin'
import { spinner, } from '../../alleycat-components/spinner'
import Dialog from '../../alleycat-components/Dialog'
import { Search, } from '../../containers/Search'
import { BigButton, DialogContentsS, DropDown, MenuItem, PaginationAndExplanation, StyledLink, Link, } from '../../components/shared'
import { Input, } from '../../components/shared/Input'

import {
  component, container, container2,
  useWhy,
  mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth,
} from '../../common'
import {
  isNotEmptyString, lookupOnOrDie,
} from '../../util-general'
import { mkURLSearchParams, } from '../../util-web'
import config from '../../config'

const configTop = configure.init (config)
const configGeneral = configTop.focus ('general')
const configIcons = configTop.focus ('icons')
const configImages = configTop.focus ('images')

const iconLogin = configIcons.get ('login')
const iconLogout = configIcons.get ('logout')
const iconUpdate = configIcons.get ('update')
const iconAdmin = configIcons.get('admin')
const iconShowPasswordHidden = configIcons.get ('show-password-hidden')
const iconShowPasswordShown = configIcons.get ('show-password-shown')
const iconUser = configIcons.get ('user')

const imageLogoFB = configImages.get ('logo-fb')
const imageLogoAUP = configImages.get ('logo-aup')
const imageHeroFB = configImages.get ('hero-fb')

const minimumPasswordScore = configGeneral.get ('minimumPasswordScore')
const enforcePasswordStrength = configGeneral.get ('enforcePasswordStrength')

const configColors = configTop.focus ('colors')
const colors = configColors.gets (
  'highlight', 'highlightAlpha',
)
const linkAUP = configTop.get ('links.aup')

const Spinner = spinner ('comet')

const UserS = styled.div`
  width: 100%;
  cursor: pointer;
  position: relative;
  .x__dropdown-wrapper {
    position: relative;
    top: 15px;
  }
`

const UserinfoInstitutionS = styled.div`
  font-weight: 200;
  > .x__institution-message {
  }
  > .x__contact-message {
  }
  > .x__item {
    vertical-align: middle;
  }
  > .x__institution-message, > .x__contact-message {
    text-wrap: nowrap;
    overflow-x: hidden;
    text-overflow: ellipsis;
  }
  .x__log-in {
    margin-top: 9px;
    .x__icon {
      margin-right: 12px;
      > img {
        width: 22px;
      }
    }
  }
  > .x__separator {
    height: 2px;
    background: #00000055;
    margin-top: 10px;
    margin-bottom: 10px;
  }
  ${mediaQuery (
    mediaPhone (`
      > .x__item {
        display: block;
      }
      > .x__institution-name, .x__contact-email {
        margin-left: 10px;
      }
    `),
    mediaTablet (`
      > .x__item {
        display: inline-block;
      }
      > .x__institution-name, .x__contact-email {
        margin-left: 10px;
        text-align: initial;
      }
    `),
  )}
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
      <div className='x__item x__institution-message'>
        Je bent ingelogd via:
      </div>
      <div className='x__item x__institution-name'>
        {getInstitutionName ()}
      </div>
      <div className='x__break'/>
      <div className='x__item x__contact-message'>
        Contact:
      </div>
      <div className='x__item x__contact-email'>
        {getContactEmail ()}
      </div>
      <div className='x__separator'/>
      <div className='x__menu-item'>
        <MenuItem
          className='x__log-in'
          onClick={onClickLogIn}
          imgSrc={iconLogin}
          text='log in met gebruikersnaam en wachtwoord'
        />
      </div>
    </UserinfoInstitutionS>
  },
)

const UserinfoUserS = styled.div`
  font-size: 19px;
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
  ({ getFirstName, getLastName, getEmail, }) => <UserinfoUserS>
    <div className='x__name'>
      {getFirstName ()} {getLastName ()}
    </div>
    <div className='x__email'>
      {getEmail ()}
    </div>
  </UserinfoUserS>,
)

const User = container (
  ['User',
    {
      logOutDispatch: logOut,
    },
    {
      getUserType: selectGetUserType,
      hasPrivilegeAdminUser: selectHasPrivilegeAdminUser,
    }],
  ({ isMobile, isLoggedIn, getUserType, hasPrivilegeAdminUser, logOutDispatch, }) => {
    const navigate = useNavigate ()

    const [open, setOpen] = useState (false)
    // use to inspect easily
    // const setOpen = (_) => setOpenX (true)

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
    const onClickLogIn = useCallback (
      () => {
        navigate ('/login')
        onNavigate ()
      },
      [navigate, onNavigate],
    )
    const onClickAdmin = useCallback (
      () => {
        setOpen (false)
        navigate ('/user-admin')
      },
      [navigate])

    return <UserS tabIndex={-1} onBlur={onBlur}>
      <img src={iconUser} width='100%' onClick={onClick}/>
      <div className='x__dropdown-wrapper'>
        <DropDown open={open} contentsStyle={{ right: '0px', position: 'absolute', width: isMobile ? '90vw' : null, }}>
          {isLoggedIn | ifFalse (
            () => <div className='x__menu-items'>
                <MenuItem
                  onClick={onClickLogIn}
                  imgSrc={iconLogin}
                  text='aanmelden'
                />
              </div>,
            () => invoke (getUserType | lookupOnOrDie ('Bad user type') ({
              institution: () => <UserinfoInstitution onNavigate={onNavigate}/>,
              user: () => <>
                <UserinfoUser/>
                <hr/>
                <div className='x__menu-items'>
                  <MenuItem
                    onClick={onClickLogout}
                    imgSrc={iconLogout}
                    text='afmelden'
                  />
                  <MenuItem
                    onClick={onClickPasswordUpdate}
                    imgSrc={iconUpdate}
                    text='wachtwoord veranderen'
                  />
                  {hasPrivilegeAdminUser && <MenuItem
                    onClick={onClickAdmin}
                    imgSrc={iconAdmin}
                    text='gebruikers beheren'
                  />}
                </div>
              </>,
            })),
          )}
        </DropDown>
      </div>
    </UserS>
  },
)

const HeaderS = styled.div`
  font-weight: 700;
  background: #FFFFFF66;
  backdrop-filter: blur(5px);
  border-bottom: 2px solid black;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  > .x__logo-aup {
    // height: 100%;
    margin-right: 40px;
    min-height: 60px;
    // img {
      // width: 100%;
    // }
  }
  > .x__logo-fb {
    margin-left: -1%;
    margin-right: 40px;
  }
  > .x__nav-links {
    flex: 0 1 350px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    margin-right: 5%;
    > .x__wrapper {
      position: relative;
      top: 2px;
      overflow-y: visible;
      overflow-x: hidden;
      .x__zoek {
        vertical-align: middle;
      }
      > .x__cursor {
        height: 1px;
        width: 95%;
        margin: auto;
        background: #00000066;
        transition: left .1s;
        position: relative;
        left: -300px;
        &.x--selected {
          left: 0px;
        }
      }
    }
    a {
      color: inherit;
      text-decoration: none;
    }
  }
  > .x__user-menu {
    font-weight: normal;
    z-index: 40;
  }
  ${mediaQuery (
    mediaPhone (`
      font-size: 20px;
      padding: 10px 10px 10px 10px;
      height: auto;
      > .x__logo-aup {
        flex: 0 0 50%;
        order: 10;
        img {
          width: auto;
          height: 100%;
        }
      }
      > .x__logo-fb {
        flex: 0 0 90%;
        justify-self: middle;
        order: 20;
        margin: 30px auto 0px auto;
        margin-left: auto
      }
      > .x__nav-links {
        flex: 0 1 350px;
        order: 30;
        margin-top: 30px;
        margin-left: 4%;
      }
      > .x__user-menu {
        flex: 0 0 50px;
        order: 15;
      }
    `),
    mediaTablet (`
      height: 100px;
      padding: 0px 15px 0px 50px;
      > .x__logo-aup {
        flex: 0 1 20%;
        img {
          width: 100%;
          height: auto;
        }
      }
      > .x__logo-fb {
        flex: 0 0 30%;
        margin-top: initial;
      }
      > .x__nav-links {
        flex: 0 1 200px;
        margin-top: initial;
        > .x__wrapper {
          left: 50%;
          transform: translateX(-50%);
        }
      }
      > .x__user-menu {
        order: 40;
      }
    `),
    mediaDesktop (`
      font-size: 25px;
      > .x__logo-aup {
        flex: 0 0 auto;
        height: 100%;
        img {
          width: auto;
          height: 100%;
        }
      }
      > .x__nav-links {
        flex: 0 1 auto;
      }
    `)
  )},
`

const Header = ({ isMobile, isLoggedIn, page, }) => {
  const isSelected = useCallback ((which) => page === which, [page])
  const cls = useCallback ((which) => isSelected (which) && 'x--selected', [isSelected])
  return <HeaderS>
    <div className='x__logo-aup'>
      <a href={linkAUP}>
        <img src={imageLogoAUP}/>
      </a>
    </div>
    <div className='x__logo-fb'>
      <Logo/>
    </div>
    <div className={clss ('x__nav-links', isMobile && isSelected ('search') && 'u--hide')}>
      <div className='x__wrapper'>
        {isLoggedIn | ifTrue (
          () => <Link to='/search/*' preserveQueryParams={true} disabled={page === 'search'} withArrow={isMobile}><span className='x__zoek'>Zoek een fonds</span></Link>,
            () => <Link to='/login' preserveQueryParams={true}><span className='x__zoek'>Zoek een fonds</span></Link>,
        )}
        <div className={clss ('x__cursor', cls ('search'))}/>
      </div>
    </div>
    <div className='x__user-menu'>
      <User isMobile={isMobile} isLoggedIn={isLoggedIn}/>
    </div>
  </HeaderS>
}

const LogoS = styled.div`
  z-index: 2;
  position: relative;
  img {
    width: 100%;
  }
  a {
    text-decoration: none;
    color: inherit;
  }
`

const Logo = () => <Link to='/'>
  <LogoS>
    <img src={imageLogoFB}/>
  </LogoS>
</Link>

const MainS = styled.div`
  background: white;
  background-size: 100%;
  font-size: 20px;
  // font-family: Arial;
  > .x__contents {
    > .x__header {
      z-index: 4;
      top: 0;
      left: 0;
    }
    > .x__logo {
      padding: 5px;
      width: 350px;
      margin: auto;
      margin-bottom: 40px;
      cursor: pointer;
    }
  }
  ${mediaQuery (
    mediaPhone (`
      > .x__contents > .x__header {
        position: relative;
      }
    `),
    mediaTablet (`
      > .x__contents > .x__header {
        position: sticky;
      }
    `),
    mediaDesktop (`
      > .x__contents > .x__header {
      }
    `),
  )}
`

const IconShowPasswordS = styled.div`
  cursor: pointer;
`

const IconShowPassword = ({ shown=false, height=24, className='', onClick=noop, }) => <IconShowPasswordS onClick={onClick}>
  <img src={shown ? iconShowPasswordShown : iconShowPasswordHidden} height={height} className={className}/>
</IconShowPasswordS>

const LoginS = styled.div`
  > .x__message-wrapper {
    margin-top: 40px;
    margin-bottom: 40px;
  }
  .x__submit {
    > .x__spinner {
      vertical-align: middle;
      margin-left: 25px;
      display: inline-block;
    }
  }
`

const TextBoxS = styled.div`
  position: relative;
  padding: 38px;
  padding-top: 58px;
  border: 4px solid ${colors.highlightAlpha};
  border-radius: 10px;
  font-size: 20px;
  width: 80%;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`

const TextBox2S = styled (TextBoxS)`
  padding: 20px;
`

const FullHeightCenter = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`

// --- user must apply classes col1 and col2, or whole-row, to make the mobile version work correctly.
const ResponsiveFormS = styled (TextBoxS)`
  > .x__grid {
    align-items: center;
    > .x__label, .x__icon {
      display: inline-block;
      vertical-align: middle;
      height: 35px;
    }
    ${mediaQuery (
      mediaPhone (`
        > .col1 {}
        > .col2, > .whole-row {
          margin-bottom: 20px;
        }
      `),
      mediaTablet (`
        display: grid;
        grid-template-columns: 117px auto;
        grid-auto-rows: 50px;
        row-gap: 40px;
        column-gap: 20px;
        > .whole-row {
          grid-column-start: 1;
          grid-column-end: span 2;
        }
      `),
    )}
  }
`

// --- we use a <form> to silence chromium warnings -- make sure to use event.preventDefault so it doesn't actually submit
const ResponsiveForm = ({ children, formProps={}, ... restProps }) => <form {... formProps}>
  {/* --- trivial field to silence chromium warning, with dummy onChange to silence a react warning */}
  <input hidden type='text' name='username' value='' onChange={noop} autoComplete=''/>
  <ResponsiveFormS {... restProps}>
    <div className='x__grid'>
      {children}
    </div>
  </ResponsiveFormS>
</form>

const InputWithEyeballS = styled.div`
  > .x__input {
    width: calc(100% - 24px - 20px);
    display: inline-block;
  }
  > .x__icon {
    padding-left: 20px;
  }
`

const InputWithEyeball = ({ showEyeball=true, onChange, onKeyDown, autoComplete=null, inputRef=null, type: typeProp=null, value=null, }) => {
  const [showPassword, setShowPassword] = useState (false)
  const onClickShowPassword = useCallbackConst (() => setShowPassword (not))
  const type = typeProp ?? (showPassword ? 'text' : 'password')
  const optional = {
    ... inputRef && { ref: inputRef, },
  }
  const inputProps = {
    ... autoComplete && { autoComplete, },
    ... value && { value, },
  }

  return <InputWithEyeballS>
    <div className='x__input'>
      <Input
        type={type}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputProps={inputProps}
        { ... optional }
      />
    </div>
    {showEyeball && <div className='x__icon'>
      <IconShowPassword shown={showPassword} onClick={onClickShowPassword}/>
    </div>}
  </InputWithEyeballS>
}

const PasswordStrengthS = styled.div`
  font-size: 15px;
  color: #9c3939;
  text-align: center;
  > * {
    display: inline-block;
    vertical-align: middle;
  }
  > .x__label {
    font-size: 18px;
    margin-right: 10px;
  }
  > .x__bar {
    width: 200px;
    height: 30px;
    margin: auto;
    border: 3px solid black;
    border-radius: 500px;
    position: relative;
    overflow-x: hidden;
    > .x__bar-bar {
      position: absolute;
      ${prop ('scoreProgress') >> condS ([
        gte (1) | guard (() => 'background: green;'),
        gt (0.5) | guard (() => 'background: yellow;'),
        gt (0.25) | guard (() => 'background: orange;'),
        otherwise | guard (() => 'background: red;'),
      ])}
      width: 100%;
      height: 100%;
      left: calc(-200px + 200px*${prop ('scoreProgress')});
      transition: left 0.3s;
    }
  }
`

const PasswordStrength = ({ show=true, className, score, minimumScore, }) => {
  return <PasswordStrengthS
    className={clss (show || 'u--hide', className)}
    scoreProgress={score / minimumScore}
  >
    <div className='x__label'>
      wachtwoordsterkte
    </div>
    <div className='x__bar'>
      <div className='x__bar-bar'/>
    </div>
  </PasswordStrengthS>
}

const ContentsForgotPasswordDialog = container (
  [
    'ContentsForgotPasswordDialog',
    { sendResetEmailDispatch: sendResetEmail, },
    { emailRequestPending: selectEmailRequestPending, },
  ],
  ({ sendResetEmailDispatch, emailRequestPending, }) => {
    const [email, setEmail] = useState ('')
    const canSubmit = useMemo (
      () => email | isNotEmptyString,
      [email],
    )
    const onChangeEmail = useCallbackConst (
      (event) => setEmail (event.target.value),
    )
    const submit = useCallback (
      () => sendResetEmailDispatch (email),
      [sendResetEmailDispatch, email],
    )
    const onKeyDownInput = useCallback (
      (event) => event | keyDownListenPreventDefault (
        'Enter',
		() => canSubmit && submit (),
      ),
      [canSubmit, submit],
    )
    return <DialogContentsS>
      <div className='x__title'>
        Wachtwoord vergeten
      </div>
      <p>
        Vul je e-mailadres in en klik op het knopje.
      </p>
      <p>
        Als je een account bij ons hebt dan krijg je binnen enkele ogenblikken een e-mail met instructies voor het kiezen van een nieuw wachtwoord.
      </p>
      <div style={{ display: 'inline-block', }}>
        <span style={{ marginRight: '25px', }}>
          e-mailadres
        </span>
        <Input type='email' autoComplete='username' value={email} onChange={onChangeEmail} onKeyDown={onKeyDownInput} width='300px'/>
        <span style={{ marginLeft: '15px', }} className='x__spinner'>
          {emailRequestPending && <Spinner size={20}/>}
        </span>
      </div>
      <div style={{ marginTop: '15px', }}>
        <BigButton disabled={not (canSubmit)} onClick={submit}>
          OK
        </BigButton>
      </div>
    </DialogContentsS>
  }
)

const UserPasswordForm = container (
  ['UserPasswordForm', {
    resetPasswordDispatch: resetPassword,
  }, {
    getInstitutionName: selectGetInstitutionName,
    emailRequestSuccess: selectEmailRequestSuccess,
    passwordReset: selectPasswordReset,
  }],
  ({ isMobile, mode, logIn, email: emailProp='', resetPasswordToken, passwordReset, resetPasswordDispatch, getInstitutionName, emailRequestSuccess, }) => {
    const navigate = useNavigate ()

    const getUserType = useSelector (selectGetUserType)
    const [email, setEmail] = useState (emailProp)
    useEffect (() => {
      setEmail (emailProp)
    }, [emailProp])

    const [password, setPassword] = useState ('')
    const [forgotPasswordDialogIsOpen, setForgotPasswordDialogIsOpen] = useState (false)

    const inputEmailRef = useRef (null)
    const inputPasswordRef = useRef (null)

    const isLoggedInInstitution = getUserType === 'institution'

    const onChangeEmail = useCallbackConst (
      (event) => setEmail (event.target.value),
    )

    const onChangePassword = useCallbackConst (
      (event) => setPassword (event.target.value),
    )

    const doLogIn = useCallback (
      () => invoke (mode | lookupOnOrDie ('doLogIn: invalid mode ' + mode, {
        login: () => logIn (email, password),
        // --- these both do the same thing from here on out so we just call the action
        // resetPassword
        'init-password': () => resetPasswordDispatch (email, password, resetPasswordToken, navigate),
        'reset-password': () => resetPasswordDispatch (email, password, resetPasswordToken, navigate),
      })),
      [mode, logIn, email, password, resetPasswordDispatch, resetPasswordToken, navigate],
    )

    const onClickSubmit = useCallback (() => {
      event.preventDefault ()
      doLogIn ()
    }, [doLogIn])

    const onKeyDownInput = useCallback (
      (event) => event | keyDownListenPreventDefault (
        'Enter',
		() => canSubmit && doLogIn (),
      ),
      [doLogIn, canSubmit],
    )

    const closeForgotPasswordDialog = useCallbackConst (
      () => setForgotPasswordDialogIsOpen (false),
    )

    useEffect (() => setForgotPasswordDialogIsOpen (false), [emailRequestSuccess])

    // --- we want this effect to run exactly once, hence the empty array -- this makes the linter
    // complain but seems to be a case of the linter being too picky.
    useEffect (() => {
      if (mode === 'login') {
        setEmail (inputEmailRef.current.value)
        if (email === '') inputEmailRef.current.focus ()
        else inputPasswordRef.current.focus ()
      }
      else inputPasswordRef.current.focus ()
    }, [])

    const passwordScore = useMemo (
      () => zxcvbn (password).score,
      [password],
    )
    const passwordIsStrongEnough = useMemo (
      () => enforcePasswordStrength ? (passwordScore >= minimumPasswordScore) : true,
      [passwordScore],
    )
    const passwordIsNotEmpty = useMemo (
      () => password | isNotEmptyString,
      [password],
    )
    const canSubmit = useMemo (
      () => lets (
        () => mode === 'login',
        ifTrue (
          () => isNotEmptyString (email),
          () => passwordIsStrongEnough,
        ),
      ),
      [mode, passwordIsStrongEnough, email],
    )
    const onClickForgotPassword = useCallbackConst (
      () => setForgotPasswordDialogIsOpen (true),
    )
    const choosePassword = mode === 'reset-password' || mode === 'init-password'
    const choosePasswordNew = mode === 'reset-password' ? 'nieuw ' : ''
    const passwordResetPending = passwordReset | requestIsPending

    return <LoginS>
      <Dialog
        isMobile={isMobile}
        isOpen={forgotPasswordDialogIsOpen}
        closeOnOverlayClick={true}
        onRequestClose={closeForgotPasswordDialog}
        showCloseButton={isMobile}
      >
        <ContentsForgotPasswordDialog/>
      </Dialog>
      <div className='x__message-wrapper'>
        {mode === 'login' && isLoggedInInstitution && <TextBox2S className='x__message'>
          <p>
            Je bent ingelogd via {getInstitutionName ()}.
          </p>
          <p>
            Je kunt door naar <StyledLink to='/search/*'>de zoekpagina</StyledLink>, of je kunt inloggen met een gebruikersnaam en wachtwoord als je een account bij ons hebt.
          </p>
        </TextBox2S>
        }
      </div>
      <FullHeightCenter>
        <ResponsiveForm>
          {/* --- the form is there to silence a chromium warning, but doesn't really do anything; make sure to use event.preventDefault so it doesn't submit */}
          {choosePassword && <div className='x__choose-password whole-row'>
            Kies een {choosePasswordNew}wachtwoord
          </div>}
          {mode === 'login' && <>
            <div className='x__label x__email col1'>
              emailadres
            </div>
            {/* we use InputWithEyeball with a hidden eyeball so we can align nicely with the password field */}
            <div className='col2'>
              <InputWithEyeball
                showEyeball={false}
                onChange={onChangeEmail}
                onKeyDown={onKeyDownInput}
                inputRef={inputEmailRef}
                type='email'
                autoComplete='username'
              />
            </div>
            <div className='x__label x__password col1'>
              wachtwoord
            </div>
          </>}
          <div className={clss ('col2', mode !== 'login' && 'whole-row')}>
            <InputWithEyeball
              onChange={onChangePassword}
              onKeyDown={onKeyDownInput}
              inputRef={inputPasswordRef}
              autoComplete='new-password'
            />
          </div>

          {enforcePasswordStrength && mode !== 'login' && <>
            <div className='whole-row' style={{ margin: '30px 0', }}>
              <PasswordStrength
                show={passwordIsNotEmpty}
                score={passwordScore}
                minimumScore={minimumPasswordScore}
              />
            </div>
            {/* --- so that we can apply a bottom margin to the previous row */}
            <div className='whole-row'/>
          </>}

          <div className='whole-row x__submit'>
            <BigButton disabled={not (canSubmit)} onClick={onClickSubmit}>
              {mode === 'login' ? 'aanmelden' : 'OK'}
            </BigButton>
            <div className='x__spinner'>
              {passwordResetPending && <Spinner spinning={true} size={20}/>}
            </div>
          </div>

          {mode === 'login' && <>
            <div className='x__forgot-password whole-row'>
              <MenuItem
                onClick={onClickForgotPassword}
                imgSrc={null}
                text='Ik ben mijn wachtwoord vergeten'
                withArrow={isMobile}
              />
            </div>
          </>}
        </ResponsiveForm>
        </FullHeightCenter>
    </LoginS>
  },
)

const Login = container ([
  'Login', { logInDispatch: logIn, }, {},
], ({ isMobile, email='', logInDispatch, }) => <>
  <UserPasswordForm isMobile={isMobile} mode='login' email={email} logIn={logInDispatch}/>
</>
)

const UserActivateS = styled.div`
`

const UserActivate = ({ email, mode, token: resetPasswordToken, }) => <UserActivateS>
  <UserPasswordForm mode={mode} email={email} resetPasswordToken={resetPasswordToken}/>
</UserActivateS>

const FondsS = styled.div`
  display: inline-block;
  height: 500px;
  background: ${colors.highlightAlpha};
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

const UserPage = container (
  ['UserPage',
    {
      passwordUpdateDispatch: passwordUpdate,
      passwordUpdateDoneDispatch: passwordUpdateDone,
    },
    {
      passwordUpdated: selectPasswordUpdated,
      passwordUpdatedResolved: selectPasswordUpdatedResolved,
    }
  ],
  ({ passwordUpdateDispatch, passwordUpdateDoneDispatch, passwordUpdated, passwordUpdatedResolved, }) => {
    const [oldPassword, setOldPassword] = useState ('')
    const [newPassword, setNewPassword] = useState ('')

    const inputOldPasswordRef = useRef (null)
    const inputNewPasswordRef = useRef (null)

    const navigate = useNavigate ()

    useEffect (() => {
      passwordUpdatedResolved | whenTrue (
        () => {
          navigate ('/')
          passwordUpdateDoneDispatch ()
        }
      )
    }, [navigate, passwordUpdateDoneDispatch, passwordUpdatedResolved])

    const onChangeOldPassword = useCallbackConst (
      (event) => setOldPassword (event.target.value),
    )

    const onChangeNewPassword = useCallbackConst (
      (event) => setNewPassword (event.target.value),
    )

    const doPasswordUpdate = useCallback (
      () => passwordUpdateDispatch (oldPassword, newPassword),
      [oldPassword, newPassword, passwordUpdateDispatch],
    )

    const onKeyDownInput = useCallback (
      (event) => event | keyDownListenPreventDefault (
        'Enter',
        () => canSubmitPassword && doPasswordUpdate (),
      ),
      [doPasswordUpdate, canSubmitPassword],
    )

    const onClickPasswordUpdate = () => doPasswordUpdate ()

    const passwordScore = useMemo (
      () => zxcvbn (newPassword).score,
      [newPassword],
    )
    const passwordIsStrongEnough = useMemo (
      () => enforcePasswordStrength ? (passwordScore >= minimumPasswordScore) : true,
      [passwordScore],
    )
    const newPasswordIsNotEmpty = useMemo (
      () => newPassword | isNotEmptyString,
      [newPassword],
    )
    const canSubmitPassword = useMemo (
      () => all (
        () => newPasswordIsNotEmpty,
        () => oldPassword | isNotEmptyString,
        () => passwordIsStrongEnough,
      ),
      [newPasswordIsNotEmpty, oldPassword, passwordIsStrongEnough],
    )
    const passwordUpdatedPending = passwordUpdated | requestIsPending

    return <FullHeightCenter>
      <ResponsiveForm>
        <div className='x__label x__password col1'>
          huidig wachtwoord
        </div>
        <div className='x__input x__password-input col2'>
          <InputWithEyeball
            onChange={onChangeOldPassword}
            onKeyDown={onKeyDownInput}
            inputRef={inputOldPasswordRef}
            autoComplete='current-password'
          />
        </div>
        <div className='x__label x__new-password col1'>
          nieuw wachtwoord
        </div>
        <div className='x__input x__new-password-input col2'>
          <InputWithEyeball
            onChange={onChangeNewPassword}
            onKeyDown={onKeyDownInput}
            inputRef={inputNewPasswordRef}
            autoComplete='new-password'
          />
        </div>
        {enforcePasswordStrength && <>
          <div className='whole-row' style={{ margin: '30px 0', }}>
            <PasswordStrength
              show={newPasswordIsNotEmpty}
              score={passwordScore}
              minimumScore={minimumPasswordScore}
            />
          </div>
          {/* --- so that we can apply a bottom margin to the previous row */}
          <div className='whole-row'/>
        </>}
        <div>
          <BigButton disabled={not (canSubmitPassword)} onClick={onClickPasswordUpdate}>versturen</BigButton>
        </div>
        {passwordUpdatedPending && <Spinner spinning={true} size={20}/>}
      </ResponsiveForm>
    </FullHeightCenter>
  }
)

const SearchWrapperS = styled.div`
  width: 100%;
  height: 75%;
  margin: auto;
  margin-top: 50px;
  text-align: center;
`

const SearchWrapper = ({ style, ... rest }) => <SearchWrapperS style={style}>
  <Search {... rest}/>
</SearchWrapperS>

const LandingS = styled.div`
  cursor: text;
  > .x__hero {
    margin: auto;
  }
  > .x__contents {
    display: flex;
    // > .x__outline {
      // flex: 0 0 400px;
    // }
    > .x__text {
      flex: 1 0 0px;
      margin-bottom: 50px;
      > .x__heading-1 {
        display: none;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      > .x__heading-2 {
        font-size: 21px;
      }
      > p {
        font-size: 16px;
      }
    }
  }
  ${mediaQuery (
    mediaPhone (`
      > .x__hero {
        margin-bottom: 20px;
      }
      > .x__contents {
        > .x__empty {
          flex: 0 0 0px;
        }
        > .x__text {
          padding: 0px 20px;
        }
      }
    `),
    mediaTablet (`
      > .x__hero {
        margin-bottom: 50px;
      }
      > .x__contents {
        margin-top: 30px;
        margin-left: 100px;
        margin-right: 100px;
        > .x__empty {
          flex: 0 0 400px;
        }
        > .x__text {
          padding: initial;
        }
      }
    `),
  )}
`

const Landing = () => {
  const [assembleHero, setAssembleHero] = useState (false)
  const [assembled, setAssembled] = useState (false)
  const [triggerSecondEffect, setTriggerSecondEffect] = useState (false)
  const contentsRef = useRef (document.querySelector ('div[class^="App__AppWrapper"]'))
  const listener = useCallbackConst ((event) => {
    const st = event.target.scrollTop
    if (st > 0) setAssembleHero (true)
  })
  const onAssembled = useCallbackConst (() => setAssembled (true))
  useEffect (() => {
    1000 | setTimeoutOn (() => setTriggerSecondEffect (true))
  }, [])
  useEffect (() => {
    if (not (triggerSecondEffect)) return
    const el = contentsRef.current
    if (not (el))
      return iwarn ('contentsRef.current is null')
    el.addEventListener ('scroll', listener)
    return () => el.removeEventListener ('scroll', listener)
  }, [triggerSecondEffect, listener])
  return <LandingS>
    <div className='x__hero'>
      <img src={imageHeroFB} width='100%'/>
    </div>
    <div className='x__contents'>
      {false && <div className='x__outline'>
        <div className='x__item'>
          Over
        </div>
        <div className='x__item'>
          Wetenschappelijke publicaties
        </div>
        <div className='x__item'>
          Educative publicaties
        </div>
      </div>}
      {/* --- @todo actually just a margin-left */}
      <div className='x__empty'/>
      <div className='x__text text'>
        <div className='x__heading-1'>
          Over Amsterdam University Press
        </div>
        <div className='x__heading-2'>
          Het Fondsenboek, al jaren dé complete en betrouwbare vraagbaak voor fondsenzoekers.
          {/*
          Amsterdam University Press is een voorsaanstaande uitgeverij gespecialiseerd in academische boeken in het Engels en tijdschriften en studieboeken in ht Nederlands en Engels, voor de geesteswetenschappen en sociale wetenschappen.
          */}
        </div>
        <p>
          Fondsenboek.com is een uitgave van <StyledLink
            to='https://aup.nl'
            target='_blank'
          >Amsterdam University Press
          </StyledLink>. De onlineversie is gebaseerd op <StyledLink
            to='https://www.aup.nl/nl/book/9789048564187/fondsenboek-2024'
            target='_blank'
            >de gedrukte versie van het Fondsenboek</StyledLink>.
        </p>
        <p>
          Maatschappelijke ondernemers en organisaties, maar ook particulieren, zijn steeds vaker op zoek naar private bijdragen voor de realisering van hun projecten en idealen. Voor deze fondsenzoekers is het FondsenBoek al jaren dé complete en betrouwbare vraagbaak.
        </p>
        <p>
          Naast evidente informatie zoals: werkgebied, contact- en proceduregegevens is ook informatie te vinden over de missie, doelgroep, bestedingen en de financiën van het vermogensfonds.
        </p>
        <p>
          Interesse in een abonnement op het online Fondsenboek voor het meest actuele en complete online overzicht van Nederlandse vermogensfondsen? Klik <StyledLink
            to='https://aboland.nl/bladen/kennis-en-wetenschap/onlinefondsenboek/'
            target='_blank'
          >hier</StyledLink> voor meer informatie over een abonnement.
        </p>
        <p>
          {/*
          Gespecialiseerd in geestes- en sociale wetenschappen, publiceert Amsterdam University Press
          (AUP), academische titels, waaronder monografieën, samengestelde bundels, handboeken,
          naslagwerken, tekstboeken, tijdschriften en conferentieverslagen. Met het gevarieerde aanbod aan
          publicaties wil AUP onderzoek van hoge kwaliteit toegankelijk maken voor de bredere academische
          gemeenschap.
          */}
        </p>
      </div>
    </div>
  </LandingS>
}

  // ${prop ('shiftUp') >> ifTrue (
    // () => `margin-top: -100px;`,
    // () => `margin-top: 0px;`,
  // )}

const ContentsS = styled.div`
  width: 100vw;
  position: relative;
  > .x__main {
    position: relative;
    z-index: 1;
    background: white;
    > .x__contents-wrapper {
      // --- @todo just a guess, fix when mock-ups are complete
      min-height: 77%;
    }
  }
`

// --- few props, no state
const Contents = container (
  ['Contents', {}, {}],
  ({ isMobile, page, }) => {
    const params = useParams ()
    const dispatch = useDispatch ()
    const navigate = useNavigate ()
    const [element, shiftUp=false, effect=noop] = page | lookupOnOrDie ('Invalid page ' + page) ({
      landing: [() => <Landing/>],
      detail: [() => <FondsDetail/>, true],
      login: [() => <Login isMobile={isMobile} email={params.email}/>],
      search: [
        () => <SearchWrapper isMobile={isMobile} query={params.query} showResults={true}/>,
        false,
        () => {
          const query = params.query
          if (nil (query)) navigate ('/search/*')
          const searchParams = document.location.search | mkURLSearchParams (
            ['categories', 'trefwoorden', 'naam_organisatie', 'werkterreinen_geografisch'],
          )
          dispatch (searchReset ())
          dispatch (searchFetch (query, searchParams))
        },
      ],
      user: [() => <UserPage/>],
      'init-password': [() => <UserActivate email={params.email} token={params.token} mode='init-password'/>],
      'reset-password': [() => <UserActivate email={params.email} token={params.token} mode='reset-password'/>],
      'user-admin': [() => <Admin isMobile={isMobile}/>],
    })

    useEffect (effect, [params, document.location.search])

    return <ContentsS shiftUp={shiftUp}>
      <div className='x__main'>
        <div className='x__contents-wrapper'>
          {element ()}
        </div>
      </div>
    </ContentsS>
  },
)

export default container (
  ['Main', {}, {
    hasPrivilegeAdminUser: selectHasPrivilegeAdminUser,
  }],
  (props) => {
    const { passProps, page, hasPrivilegeAdminUser, } = props
    const { isMobile, history, } = passProps
    const navigate = useNavigate ()

    const isLoggedIn = useSelector (selectLoggedIn)
    const landingDecision = useSelector (selectLandingDecision)

    const [returnBlank, setReturnBlank] = useState (false)

    useWhy ('Main', props)
    useSaga ({ saga, key: 'Main', })

    useEffect (() => {
      const root = '/' + (document.location.search ?? '')
      setReturnBlank (false)
      landingDecision (page) (
        // --- unauthorized and visiting a private page: send to landingspage
        () => navigate (root),
        () => setReturnBlank (true),
        // --- send away from login if logged in as user and visiting /login
        () => {
          setReturnBlank (true)
          navigate (root)
        },
        // --- forbid /user-admin without the right privileges
        () => not (hasPrivilegeAdminUser) && navigate (root),
      )
    }, [page, landingDecision, navigate, hasPrivilegeAdminUser])

    if (returnBlank) return

    return <MainS tabIndex={-1}>
      <div className='x__contents'>
        <div className='x__header'>
          <Header isMobile={isMobile} isLoggedIn={isLoggedIn} page={page}/>
        </div>
        <Contents isMobile={isMobile} page={page}/>
      </div>
    </MainS>
  },
)
