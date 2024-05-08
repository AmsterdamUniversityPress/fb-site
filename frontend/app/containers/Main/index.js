import {
  pipe, compose, composeRight,
  tap, gt, gte, nil,
  not, noop, ifTrue, F, T,
  map, path, condS, eq, guard, otherwise,
  lets, id, whenTrue, invoke, prop,
  sprintfN,
  take, recurry,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import { Link, useNavigate, useParams, } from 'react-router-dom'
import { useDispatch, useSelector, } from 'react-redux'
import styled from 'styled-components'
import zxcvbn from 'zxcvbn'

import configure from 'alleycat-js/es/configure'
import { clss, keyDownListenPreventDefault, } from 'alleycat-js/es/dom'
import { logWith, } from 'alleycat-js/es/general'
import { all, ifUndefined, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useSaga, } from 'alleycat-js/es/redux-hooks'

import {
  logIn,
  logOut,
  passwordUpdate,
  passwordUpdateDone,
  resetPassword,
  sendResetEmail,
} from '../App/actions/main'

import {
  selectEmailRequestPending,
  selectEmailRequestSuccess,
  selectInstitutionLoggedIn,
  selectUserLoggedIn,
  selectGetFirstName, selectGetLastName, selectGetEmail,
  selectGetContactEmail, selectGetInstitutionName,
  selectGetUserType,
  selectHasPrivilegeAdminUser,
} from '../App/store/app/selectors'
import {
  selectFilters,
  selectFilterMap,
  selectFondsen,
  selectNumFondsen,
} from '../App/store/domain/selectors'
import {
  selectPasswordUpdated,
} from '../App/store/ui/selectors'
import { selectQuery as selectSearchQuery, } from '../Search/selectors'

import saga from './saga'

import FondsDetail from '../FondsDetail'
import Admin from '../Admin'
import { AlleyCatFooter, spinner, } from '../../alleycat-components'
import Dialog from '../../alleycat-components/Dialog'
import { Search, } from '../../containers/Search'
import { BigButton, DialogContentsS, DropDown, MenuItem, PaginationAndExplanation, } from '../../components/shared'
import { Input, } from '../../components/shared/Input'
import CloseIcon from '../../components/svg/CloseIcon'
import mkPagination from '../../containers/shared/Pagination'

import {
  component, container, container2,
  useWhy,
  mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth,
  requestResults,
} from '../../common'
import {
  foldWhenJust, isNotEmptyString, lookupOn, lookupOnOrDie, mapForEach,  mapGet, mapSetM, mapUpdateM, mapX,
} from '../../util-general'
import config from '../../config'

const configTop = configure.init (config)
const configGeneral = configTop.focus ('general')
const configIcons = configTop.focus ('icons')
const configImages = configTop.focus ('images')

const paginationKey = configTop.get ('app.keys.Pagination.fonds')
const iconLogin = configIcons.get ('login')
const iconLogout = configIcons.get ('logout')
const iconUpdate = configIcons.get ('update')
const iconAdmin = configIcons.get('admin')
const iconShowPasswordHidden = configIcons.get ('show-password-hidden')
const iconShowPasswordShown = configIcons.get ('show-password-shown')
const iconUser = configIcons.get ('user')

const imageFonds = configImages.get ('fonds')
const imageLogo = configImages.get ('logo')
const imageBackground = configImages.get ('background')

const minimumPasswordScore = configGeneral.get ('minimumPasswordScore')
const enforcePasswordStrength = configGeneral.get ('enforcePasswordStrength')

const configColors = configTop.focus ('colors')
const colors = configColors.gets (
  'highlight', 'highlightAlpha',
  'highlight2Alpha', 'highlight2Alpha',
  'highlight3Alpha', 'highlight3Alpha',
  'highlight4Alpha', 'highlight4Alpha',
)

const Spinner = spinner ('comet')

const UserS = styled.div`
  width: 50px;
  cursor: pointer;
  position: relative;
  .x__dropdown-wrapper {
    position: relative;
    top: 15px;
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
    margin-top: 9px;
    .x__icon {
      margin-right: 12px;
      > img {
        width: 22px;
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
      <MenuItem
        className='x__log-in'
        onClick={onClickLogIn}
        imgSrc={iconLogin}
        text='log in met gebruikersnaam en wachtwoord'
      />
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
  ({ getUserType, hasPrivilegeAdminUser, logOutDispatch, }) => {
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
    const onClickAdmin = useCallback (
      () => {
        setOpen (false)
        navigate ('/user-admin')
      },
      [navigate])

    return <UserS tabIndex={-1} onBlur={onBlur}>
      <img src={iconUser} height='40px' onClick={onClick}/>
      <div className='x__dropdown-wrapper'>
        <DropDown open={open} contentsStyle={{ right: '0px', position: 'absolute', }}>
          {invoke (getUserType () | lookupOnOrDie ('Bad user type') ({
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
          }))}
        </DropDown>
      </div>
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
    height: 90px;
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
</HeaderS>

const LogoS = styled.div`
  border: 1px solid black;
  padding: 20px;
  background: ${colors.highlight4Alpha};
  &, .x__background {
    border-radius: 7px;
  }
  .x__item {
    width: 100%;
    height: 100%;
  }
  .x__link {
    z-index: 2;
    position: relative;
  }
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
    <div className='x__item x__link'>
      <img src={imageLogo}/>
    </div>
  </LogoS>
</Link>

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

const IconShowPasswordS = styled.div`
  cursor: pointer;
`

const IconShowPassword = ({ shown=false, height=24, className='', onClick=noop, }) => <IconShowPasswordS onClick={onClick}>
  <img src={shown ? iconShowPasswordShown : iconShowPasswordHidden} height={height} className={className}/>
</IconShowPasswordS>

const LoginS = styled.form`
  > .x__form {
    margin-top: 70px;
  }
  > .x__message {
    margin-bottom: 40px;
  }
`

const TextBoxS = styled.div`
  position: relative;
  padding: 38px;
  padding-top: 58px;
  border: 1px solid black;
  border-radius: 10px;
  background: ${colors.highlightAlpha};
  font-size: 20px;
  width: 80%;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`

const FormWrapper = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`

const FormS = styled (TextBoxS) `
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
  .x__grid {
    display: grid;
    grid-template-columns: 117px auto 24px;
    grid-auto-rows: 50px;
    row-gap: 40px;
    column-gap: 20px;
    input {
      height: 100%;
      width: 100%;
      border: 1px solid #999999;
      padding: 10px;
    }
    > .x__label, .x__icon {
      display: inline-block;
      position: relative;
      top: 50%;
      height: 35px;
      transform: translateY(-50%);
    }
    .x__input {
      background: white;
    }
    > .span-cols {
      grid-column-start: 1;
      grid-column-end: 3;
    }
    // --- @todo this should probably be .x__text
    x__text {
      width: 400px;
      padding: 20px;
    }
  }
`

const PasswordStrengthS = styled.div`
  font-size: 15px;
  color: #9c3939;
  text-align: center;
  margin-bottom: 10px;
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
        <Input type='text' value={email} onChange={onChangeEmail} onKeyDown={onKeyDownInput} width='300px'/>
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
    getUserType: selectGetUserType,
    getInstitutionName: selectGetInstitutionName,
    emailRequestSuccess: selectEmailRequestSuccess,
  }],
  ({ isMobile, mode, logIn, email: emailProp='', resetPasswordToken, resetPasswordDispatch, getInstitutionName, getUserType, emailRequestSuccess, }) => {
    const navigate = useNavigate ()

    const [email, setEmail] = useState (emailProp)
    useEffect (() => {
      setEmail (emailProp)
    }, [emailProp])

    const [password, setPassword] = useState ('')
    const [showPassword, setShowPassword] = useState (false)
    const [forgotPasswordDialogIsOpen, setForgotPasswordDialogIsOpen] = useState (false)

    const inputEmailRef = useRef (null)
    const inputPasswordRef = useRef (null)

    const isLoggedInInstitution = getUserType () === 'institution'

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

    // --- the outer element is a form, which is there to silence a chromium warning, but doesn't really do anything.
    // Make sure to use event.preventDefault so it doesn't submit

    return <LoginS>
      <Dialog
        isMobile={isMobile}
        isOpen={forgotPasswordDialogIsOpen}
        closeOnOverlayClick={true}
        onRequestClose={closeForgotPasswordDialog}
      >
        <ContentsForgotPasswordDialog/>
      </Dialog>
      {mode === 'login' && isLoggedInInstitution && <TextBoxS className='x__message'>
        <p>
          Je bent ingelogd courtesy of {getInstitutionName ()}.
        </p>
        <p>
          Je kunt door naar <Link to='/'>de fondsen</Link>, of je kunt inloggen met een gebruikersnaam en wachtwoord als je een account bij ons hebt.
        </p>
      </TextBoxS>
      }
      <FormS className='x__form'>
      {choosePassword && <div className='x__choose-password'>
        Kies een {choosePasswordNew}wachtwoord
      </div>}
        {/* --- the form is there to silence a chromium warning, but doesn't really do anything; make sure to use event.preventDefault so it doesn't submit */}
        <div className='x__grid'>
          {mode === 'login' && <>
            <div className='x__label x__email'>
              emailadres
            </div>
            <div className='x__input x__email-input'>
              <input type='email' autoComplete='username' value={email} onChange={onChangeEmail} onKeyDown={onKeyDownInput} ref={inputEmailRef}/>
            </div>
          </> || <>
            <div/>
            <div/>
          <div/>
          </>}
          <div/>
          {mode === 'login' && <div className='x__label x__password'>
            wachtwoord
          </div>}
          <div className='x__input x__password-input'>
            <input type={showPassword ? 'text' : 'password'} autoComplete='current-password' onChange={onChangePassword} onKeyDown={onKeyDownInput} ref={inputPasswordRef}/>
          </div>
          <div className='x__icon'>
            <IconShowPassword shown={showPassword} onClick={onClickShowPassword}/>
          </div>
          <div/>

          {enforcePasswordStrength && mode !== 'login' && <>
            <div className='span-cols'>
              <PasswordStrength
                show={passwordIsNotEmpty}
                score={passwordScore}
                minimumScore={minimumPasswordScore}
              />
            </div>
            <div/>
            <div/>
          </>}

          <div>
            <BigButton disabled={not (canSubmit)} onClick={onClickSubmit}>
              {mode === 'login' ? 'aanmelden' : 'OK'}
            </BigButton>
          </div>

          {mode === 'login' && <>
            <div className='x__forgot-password span-cols'>
              <MenuItem
                onClick={onClickForgotPassword}
                imgSrc={null}
                text='Ik ben mijn wachtwoord vergeten'
              />
            </div>
            <div/>
            <div/>
          </>}

        </div>
      </FormS>
    </LoginS>
  },
)

const Login = container ([
  'Login', { logInDispatch: logIn, }, {},
], ({ isMobile, email='', logInDispatch, }) => <FormWrapper>
  <UserPasswordForm isMobile={isMobile} mode='login' email={email} logIn={logInDispatch}/>
</FormWrapper>
)

const UserActivateS = styled.div`
`

const UserActivate = ({ email, mode, token: resetPasswordToken, }) => <UserActivateS>
  <UserPasswordForm mode={mode} email={email} resetPasswordToken={resetPasswordToken}/>
</UserActivateS>

const OptionS = styled.div`
  .x__select {
    display: inline-block;
    padding-right: 20px;
  }
  .x__data {
    display: inline-block;
    &:hover {
      background: #ffcbcb6b;
    }
  }
`

const Option = ({
  data,
  onSelect,
  selected: selectedProp,
}) => {
  const [selected, setSelected] = useState (selectedProp)
  const onClick = useCallback (() => {
    setSelected (not)
    onSelect ()
  }, [onSelect, setSelected])
  return <OptionS>
    <div className='x__select'>
      {selected ? 'yes' : 'no'}
    </div>
    <div
      className='x__data'
      onClick={onClick}
    >
      {data}
    </div>
  </OptionS>
}

const FilterS = styled.div`
  .x__dropdown-wrapper {
  }
  .x__filter {
    background: white;
    display: inline-block;
    font-size: 20px;
    width: 100%;
    height: 35px;
    .x__filter-name {
      padding-left: 10px;
      display: inline-block;
      width: 200px;
    }
    .x__filter-open-char, .x__filter-close-char {
      display: inline-block;
      font-size: 35px;
      padding-left: 20px;
      position: absolute;
    }
    .x__filter-open-char {
      margin-top: -1px;
    }
    .x__filter-close-char {
      margin-top: -16px;
    }
  }
`

const Filter = ({ name, options, optionMap, onChange, }) => {
  const [open, setOpen] = useState (false)
  const onClick = useCallbackConst (
    () => setOpen (not),
  )
  const onSelect = useCallback (
    (option) => () => {
      onChange (option)
  }, [onChange])

  return <FilterS>
    <div className='x__filter' onClick={onClick}>
      {open | ifTrue (
        () => <><div className='x__filter-name'> {name}</div><div className='x__filter-open-char'>⌃</div></>,
        () => <><div className='x__filter-name'> {name}</div> <div className='x__filter-close-char'>⌄</div></>
      )}
    </div>
    <div className='x__dropdown-wrapper'>
      <DropDown open={open} contentsStyle={{ position: 'relative', maxWidth: '200px', textWrap: 'wrap' }}>
        {options | mapX ((option, idx) => {
          // @todo make nice option_short
          const option_short = (option | take (15)) + ' ... '
          return <Option
            key={option}
            data={option_short}
            selected={optionMap | mapGet (option)}
            onSelect={onSelect (option)}
          />
        }
        )}
      </DropDown>
    </div>
  </FilterS>
}

const FiltersS = styled.div`
  > .x__button {
    padding: 20px;
  }
`

// @todo find a nice place for this
// probably possible to use remapMapTuples from kattenluik
const mapToList = (m) => {
  const ret = []
  m | mapForEach ((options, name) => options
    | mapForEach ((val, option) => val | whenTrue (
      () => ret.push ([name, option]))))
  return ret
}

const Filters = container2 (
  ['Filters'],
  (props) => {
    const filters = useSelector (selectFilters)
    const filterMapProp = useSelector (selectFilterMap)
    // --- the query that has been accepted, and may or may not have already been executed.
    const searchQuery = useSelector (selectSearchQuery)
    const navigate = useNavigate ()

    // @todo can we use a selector as starting point for state like this?
    const [filterMap, setFilterMap] = useState (filterMapProp | ifUndefined (
      () => new Map (),
      id
    ))

    const onChange = useCallback (
      (name) => (option) => {
        setFilterMap (
          filterMap | mapUpdateM (
            name,
            mapUpdateM (option, not),
        ))
      }, [filterMap, setFilterMap],
    )

    // --- @mock
    const onClickSubmit = useCallback (() => {
      const filterMapTemp = filterMap | mapToList
      const params = new URLSearchParams (filterMapTemp)
      navigate ([encodeURIComponent (searchQuery), params.toString ()] | sprintfN (
        '/search/%s?%s',
      ))
    }, [navigate, filterMap, searchQuery])

    // --- currently don't show the filters if there isn't an active search query
    if (nil (searchQuery)) return

    return <FiltersS>
      {filters | requestResults ({
        spinnerProps: { color: 'black', size: 20, delayMs: 400, },
          onError: noop,
          onResults: (results) => <>
            {results | map (
              ({ name, options, }) => <Filter
                key={name}
                name={name}
                options={options}
                optionMap={filterMap | mapGet (name)}
                onChange={onChange (name)}
              />
            )}
          </>,
      })}
      <div className='x__button'>
        <BigButton disabled={false} onClick={onClickSubmit}>Zoek</BigButton>
      </div>
    </FiltersS>
  }
)

const SidebarS = styled.div`
  height: 100%;
  width: 100%;
  padding: 20px;
  background: #FFFFFF66;
  backdrop-filter: blur(5px);
`

const Sidebar = () => {
  // these categories  are all that occur (checked with a script)
  return <SidebarS>
    <Filters/>
  </SidebarS>
}

const FondsS = styled.div`
  display: inline-block;
  height: 500px;
  // background: #aaaa66ff;
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
      font-family: Lora, serif;
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
  text-align: center;
  min-width: 100px;
  .x__main {
  }
`

const Pagination = mkPagination (paginationKey)

const Fondsen = container (
  ['Fondsen', {}, {
    fondsen: selectFondsen,
    numFondsenMb: selectNumFondsen,
  }],
  ({ fondsen, numFondsenMb, }) => <FondsenS>
    {numFondsenMb | foldWhenJust (
      (numItems) => <PaginationAndExplanation
        showExplanation={false}
        numItems={numItems}
        Pagination={Pagination}
      />,
    )}
    {fondsen | requestResults ({
      spinnerProps: { color: 'white', size: 60, delayMs: 400, },
      onError: noop,
      onResults: (results) => <>
        {results | map (
          ({ uuid, naam_organisatie, categories, website, ... _rest }) => {
            return <Fonds
              key={uuid} uuid={uuid} naam_organisatie={naam_organisatie} categories={categories}
              website={website}
            />
          },
        )}
      </>,
    })}
  </FondsenS>,
)

const UserPage = container (
  ['UserPage',
    {
      passwordUpdateDispatch: passwordUpdate,
      passwordUpdateDoneDispatch: passwordUpdateDone,
    },
    {
      getEmail: selectGetEmail,
      passwordUpdated: selectPasswordUpdated,
    }
  ],
  ({ passwordUpdateDispatch, passwordUpdateDoneDispatch, getEmail, passwordUpdated, }) => {
    const [oldPassword, setOldPassword] = useState ('')
    const [newPassword, setNewPassword] = useState ('')
    const [showPassword, setShowPassword] = useState (false)

    const inputOldPasswordRef = useRef (null)
    const inputNewPasswordRef = useRef (null)

    const navigate = useNavigate ()

    useEffect (() => {
      passwordUpdated | whenTrue (
        () => {
          navigate ('/')
          passwordUpdateDoneDispatch ()
        }
      )
    }, [navigate, passwordUpdateDoneDispatch, passwordUpdated])

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
      [getEmail, oldPassword, newPassword, passwordUpdateDispatch],
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

    const onClickClose = useCallbackConst (() => {
      navigate ('/')
      passwordUpdateDoneDispatch ()
    })

    return <FormWrapper>
      <FormS style={{ marginTop: '5%', }}>
        <div className='x__close' onClick={onClickClose}>
          <CloseIcon
            height={25}
            width={25}
            strokeWidth='0.6px'
          />
        </div>
        <div className='x__grid'>
          <div className='x__label x__password'>
            huidig wachtwoord
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
          {enforcePasswordStrength && <div className='span-cols'>
            <PasswordStrength
              show={newPasswordIsNotEmpty}
              score={passwordScore}
              minimumScore={minimumPasswordScore}
            />
          </div>}
          <div/>
          <div/>
          <div>
            <BigButton disabled={not (canSubmitPassword)} onClick={onClickPasswordUpdate}>versturen</BigButton>
          </div>
        </div>
      </FormS>
    </FormWrapper>
  }
)

const SearchWrapperS = styled.div`
  width: 1000px;
  height: 75%;
  margin: auto;
  margin-top: 50px;
  text-align: center;
`

const SearchWrapper = ({ style, ... rest }) => <SearchWrapperS style={style}>
  <Search {... rest}/>
</SearchWrapperS>

const FondsMainS = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  > .x__main {
    // --- @todo
    flex: 0 0 calc(100vh - 104px);
    // overflow-y: auto;
    margin: auto;
  }
`

const FondsMain = () => {
  return <FondsMainS>
    <SearchWrapper style={{ flex: '0 0 104px', }} query={null} showResults={false}/>
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
    position: relative;
    flex: 0 0 300px;
    left: 0;
    transition: left 0.1s;
    &.x--hide {
      left: -300px;
    }
  }
  .x__main {
    // --- @todo
    flex: 1 0 calc(100vw - 300px);
    > .x__logo {
      margin-top: 50px;
      position: relative;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
    }
    > .x__contents-wrapper {
      // --- @todo just a guess, fix when mock-ups are complete
      min-height: 77%;
    }
    > .x__footer-wrapper {
      // --- 300px = sidebar.
      // width: calc(100% - 300px);
      > .x__footer {
        width: 440px;
        margin: auto;
        // --- @todo margin-bottom is giving problems, and the heights & scrollbars are a rommeltje,
        // and we need the mock-ups first before dealing with it, thus this silly thing with x__inner
        // and double padding.
        padding-top: 10px;
        padding-bottom: 10px;
        height: 50px;
        > .x__inner {
          overflow: hidden;
          box-shadow: 1px 1px 2px 1px;
          height: 30px;
          background: white;
          padding-top: 0px;
          padding-bottom: 0px;
        }
      }
    }
  }
`

const Contents = container (
  ['Contents', {}, {}],
  ({ isMobile, page, }) => {
    const params = useParams ()
    const [showSidebar, element] = page | lookupOnOrDie ('Invalid page ' + page) ({
      overview: [true, () => <FondsMain/>],
      detail: [false, () => <FondsDetail/>],
      login: [false, () => <Login isMobile={isMobile} email={params.email}/>],
      search: [true, () => <SearchWrapper query={params.query} searchParamsString={document.location.search} showResults={true}/>],
      user: [true, () => <UserPage/>],
      'init-password': [false, () => <UserActivate email={params.email} token={params.token} mode='init-password'/>],
      'reset-password': [false, () => <UserActivate email={params.email} token={params.token} mode='reset-password'/>],
      'user-admin': [false, () => <Admin/>],
    })

    return <ContentsS>
      <div className={clss ('x__sidebar', showSidebar || 'x--hide')}>
        <Sidebar/>
      </div>
      <div className='x__main'>
        <div className='x__logo'>
          <Logo/>
        </div>
        <div className='x__contents-wrapper'>
          {element ()}
        </div>
        <div className='x__footer-wrapper'>
          <div className='x__footer'>
            <div className='x__inner'>
              <AlleyCatFooter type='simple'
                style={{
                  fontSize: '16px',
                  paddingBottom: '30px',
                  color: 'black',
                }}
                textStyle={{
                  position: 'relative',
                  top: '2px',
                }}
                linkStyle={{
                  fontVariant: 'small-caps',
                  position: 'relative',
                  fontSize: '100%',
                  top: '0px',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </ContentsS>
  },
)

export default container (
  ['Main', {}, {
    institutionLoggedIn: selectInstitutionLoggedIn,
    hasPrivilegeAdminUser: selectHasPrivilegeAdminUser,
    userLoggedIn: selectUserLoggedIn,
  }],
  (props) => {
    const {passProps, page, hasPrivilegeAdminUser, institutionLoggedIn, userLoggedIn, } = props
    const { isMobile, history, } = passProps
    const navigate = useNavigate ()

    useWhy ('Main', props)
    useSaga ({ saga, key: 'Main', })

    const collapse = requestResults ({
      onError: noop,
      onResults: id,
      onLoading: noop,
    })

    const isLoading = requestResults ({
      onError: F,
      onResults: F,
      onLoading: T,
    })

    const isInstitutionLoggedIn = institutionLoggedIn | collapse
    const isUserLoggedIn = userLoggedIn | collapse
    const isLoggedIn = isInstitutionLoggedIn || isUserLoggedIn
    const isUserLoggedInPending = userLoggedIn | isLoading

    const pageIsChoosePassword = page === 'reset-password' || page === 'init-password'

    useEffect (() => {
      if (not (isLoggedIn) && not (isUserLoggedInPending) && not (pageIsChoosePassword) && page !== 'login') navigate ('/login')
      else if (isUserLoggedIn && page === 'login') navigate ('/')
      else if (not (hasPrivilegeAdminUser) && page === 'user-admin') navigate ('/')
    }, [isLoggedIn, isUserLoggedInPending, pageIsChoosePassword, page, navigate, isUserLoggedIn, hasPrivilegeAdminUser])

    if (not (isLoggedIn) && page !== 'login' && not (pageIsChoosePassword)) return

    return <MainS tabIndex={-1}>
      <div className='x__contents'>
        <div className='x__header'>
          <Header isLoggedIn={isLoggedIn}/>
        </div>
        <Contents isMobile={isMobile} page={page}/>
      </div>
    </MainS>
  },
)
