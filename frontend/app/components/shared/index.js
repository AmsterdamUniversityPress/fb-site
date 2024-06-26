import {
  pipe, compose, composeRight,
  prop, sprintf1, ifNil, noop, lets, ok,
  sprintfN, tap, not, ifTrue,
  ifOk, whenOk,
} from 'stick-js/es'

import React, { useCallback, } from 'react'
import styled from 'styled-components'
import { Link as LinkReal, } from 'react-router-dom'

import configure from 'alleycat-js/es/configure'
import { logWith, } from 'alleycat-js/es/general'
import { ifTrueV, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'
import { clss, } from 'alleycat-js/es/dom'

import { mediaPhone, mediaTablet, mediaDesktop, isMobileWidth, } from '../../common'
import { mapLookupOnOr, } from '../../util-general'

import Dialog from '../../alleycat-components/Dialog'

import config from '../../config'

const configTop = config | configure.init
const colorHighlight1 = configTop.get ('colors.highlight')
const colorHighlight2 = configTop.get ('colors.highlight2')
const iconArrow = configTop.get ('icons.arrow')

// --- fakeDisabled means the onClick handler is called, but the button doesn't move when clicked.
// --- it's useful for e.g. letting the click event bubble to an outer comopnent.
const ButtonBaseS = styled.button`
  border: 1px solid black;
  border-radius: 2px;
  display: inline-block;
  ${prop ('fakeDisabled') >> ifTrueV (
    ``,
    `
    &:not(:disabled) {
      cursor: pointer;
      &:active {
        transition: all .03s;
        transform: translateY(1px) translateX(1px);
        opacity: 0.8;
      }
    }
    `,
  )}
  img {
    width: 20px;
    margin-right: 10px;
    position: relative;
    top: -1px;
  }
  &:focus {
    outline: none;
  }
`

export const ButtonS = styled (ButtonBaseS)`
  background: ${colorHighlight1};
  color: white;
  position: relative;
  opacity: 0.5;
  padding: 2px;
  > div {
    padding: 4px;
    width: 100%;
    height: 100%;
  }
  &:not(:disabled) {
    opacity: 1.0;
    &:active {
      border-style: solid;
    }
  }
  ${mediaQuery (
    mediaTablet (`
      &:not(:disabled) {
        &:hover {
          color: black;
          background: ${colorHighlight2};
        }
      }
    `),
  )}
`

export const Button = ({ children, innerStyle={}, cls='', ... restProps }) => {
  return <ButtonS type='submit' {... restProps}>
    <div className={cls} style={innerStyle}>
      {children}
    </div>
  </ButtonS>
}

export const Button2 = styled (ButtonBaseS)`
  border-radius: 5px;
  padding: 7px;
`

const TextDivS = styled.div`
  cursor: text;
`

export const TextDiv = (props) => <TextDivS {...props}/>

const SpinnerS = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  justify-content: center;
  align-items: center;
  color: #370707;
  .x__kid-t, .x__kid-d, .x__kid-m {
    position: relative;
  }
  ${mediaQuery (
    mediaPhone (`
      .x__kid-t, .x__kid-d { display: none; }
      .x__kid-m { display: block; top: -20%; }
    `),
    mediaTablet (`
      .x__kid-m, .x__kid-d { display: none; }
      /* --- why was the left necessary?
      .x__kid-t { display: block; top: -18%; left: -10%; }
      */
      .x__kid-t { display: block; top: -18%; }
    `),
    mediaDesktop (`
      .x__kid-m, .x__kid-t { display: none; }
      /* --- why was the left necessary?
      .x__kid-d { display: block; top: -10%; left: -10%; }
      */
      .x__kid-d { display: block; top: -10%; }
    `),
  )}
`

// --- trivial styled component to allow passing ref.
export const Div = styled.div`
`

const ButtonMS = styled (Button2)`
  ${prop ('selected') >> ifTrueV (
    `
      background: #44A;
      color: white;
    `,
    `
      background: #FFF;
      color: black;
    `,
  )}
  ${prop ('greyed') >> ifTrueV (
    'opacity: 0.5;', '',
  )}
  width: ${prop ('width')};
  flex: 1 0 auto;
`

const AreYouSureDialogS = styled.div`
  > .x__buttons > button {
    margin-right: 10px;
  }
`

export const AreYouSureDialog = ({
  isMobile,
  isOpen, onRequestClose,
  closeOnOverlayClick=void 8,
  onYes, onNo,
  Contents=noop,
  contentsProps={},
  show=true,
  extraWarn=false,
}) => <>
  <Dialog
    isOpen={isOpen}
    onRequestClose={onRequestClose}
    closeOnOverlayClick={closeOnOverlayClick}
    isMobile={isMobile}
  >
    <AreYouSureDialogS>
      <div className={clss ('x__contents', show || 'u--display-none')}>
        {extraWarn && <div className='x__warning-sign'/>}
        <Contents {... contentsProps}/>
      </div>
      <div className='x__buttons'>
        <Button onClick={onYes}>Ja</Button>
        <Button onClick={onNo}>Nee</Button>
      </div>
    </AreYouSureDialogS>
  </Dialog>
</>

export const ButtonM = ({ text, selected, disabled, greyed, onClick, width='100px', }) =>
  <ButtonMS
    selected={selected}
    disabled={disabled}
    fakeDisabled={true}
    greyed={greyed}
    onClick={onClick}
    width={width}
  >
    {text}
  </ButtonMS>

export const BigButton = ({ children, innerStyle={}, ... restProps }) => <Button
  innerStyle={{ padding: '10px', ... innerStyle }}
  {... restProps}
>
  {children}
</Button>

const ArrowS = styled.div`
  display: inline-block;
  padding-right: 10px;
`

const Arrow = () => <ArrowS>
  <img src={iconArrow} width='10px'/>
</ArrowS>

const MenuItemS = styled.div`
  cursor: pointer;
  &:hover > .x__text {
    border-bottom: 2px solid #00000099;
  }
  &.x--disabled {
    opacity: 0.4;
    cursor: inherit;
    > .x__text {
      border-bottom: none;
    }
  }
  > img {
    vertical-align: middle;
  }
  > .x__text {
    vertical-align: middle;
  }
  &.x--size-menu {
    > img {
      margin-right: 13px;
      width: 18px;
    }
    > .x__text {
      padding-bottom: 5px;
      font-size: 17px;
    }
  }
  &.x--size-page {
    > img {
      margin-right: 13px;
      width: 20px;
    }
    > .x__text {
      padding-bottom: 5px;
      font-size: 20px;
    }
  }
`

export const MenuItem = ({
  imgSrc=null,
  text='',
  disabled=false,
  // --- 'menu' | 'page'
  size='menu',
  Contents=null, contentsProps={},
  withArrow=false,
  ... restProps
}) => {
  const cls = clss ('x--size-' + size, disabled && 'x--disabled')
  return <MenuItemS {... restProps} className={cls}>
    {withArrow && <Arrow/>}
    {imgSrc && <img src={imgSrc}/>}
    <span className='x__text'>
      {Contents | ifNil (
        () => text,
        () => <Contents {... contentsProps}/>,
      )}
    </span>
  </MenuItemS>
}

// --- @todo ugly -- this expects the contents to have a specific layout which is only clear after
// looking at how it's used.
export const DialogContentsS = styled.div`
  > .x__title {
    font-size: 20px;
    border-bottom: 2px solid #00000022;
    margin-bottom: 25px;
    opacity: 0.8;
  }
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
    // --- @todo this is too specific.
    > .x__spinner {
      vertical-align: middle;
      position: relative;
      top: 5px;
      left: 15px;
    }
  }
  > .x__buttons {
    margin-top: 30px;
  }
`

const DropDownS = styled.div`
  > .x__wrapper {
    position: relative;
    width: 100%;
  }
  > .x__wrapper > .x__contents {
    min-width: 100%;
    background: #FBFBFB;
    border: 1px solid #999999;
    position: absolute;
    font-size: 18px;
    padding: 15px;
    cursor: default;
    box-shadow: 1px 1px 4px;
    hr {
      margin-top: 20px;
      width: 50%;
    }
    > .x__menu-items {
      margin-top: 12px;
    }
    ${mediaQuery (
      mediaPhone (`
        text-wrap: initial;
      `),
      mediaTablet (`
        text-wrap: nowrap;
      `),
    )}
  }
`

export const DropDown = ({ open=false, style={}, wrapperStyle={}, contentsStyle={}, children, }) => <DropDownS style={style}>
  <div className='x__wrapper' style={wrapperStyle}>
    {open && <div className='x__contents' style={contentsStyle}>
      {children}
    </div>}
  </div>
</DropDownS>

const PaginationAndExplanationS = styled.div`
  margin: auto;
  margin-bottom: 5px;
  background: white;
  min-height: 70px;
  text-align: center;
  font-size: 16px;
  ${mediaQuery (
    mediaPhone (`
      width: 90%;
      padding: 20px 0px 0px 0px;
    `),
    mediaTablet (`
      width: 500px;
      padding: 20px 20px 20px 20px;
    `),
  )}
`

export const PaginationAndExplanation = ({ numItems, showExplanation, Pagination, query=null, }) => {
  const mkExplanation = not (showExplanation) ? noop : (numItems, first, last) => lets (
    () => numItems | mapLookupOnOr (
      () => [first, last, numItems] | sprintfN (
        'Resultaten %d t/m %d (uit %d) worden getoond.',
      ),
      new Map ([
        [0, [query] | sprintfN ('Geen resultaten for “%s”.')],
        [1, [first, numItems] | sprintfN (
          'Resultaat %d (uit %d) wordt getoond.',
        )],
      ]),
    ),
  )
  return <PaginationAndExplanationS>
    <div className='x__main'>
      <Pagination
        numItems={numItems}
        mkExplanation={mkExplanation}
        textNumber='Aantal per pagina:'
        textPage=''
      />
    </div>
  </PaginationAndExplanationS>
}

const LinkS = styled (LinkReal)`
  cursor: text;
  color: ${colorHighlight1};
  text-decoration: none;
  border-bottom: 1px solid ${colorHighlight2};
  ${prop ('disabled') >> ifTrue (
    () => 'cursor: inherit',
    () => 'cursor: pointer',
  )}
`

// --- a wrapper around React Router's Link with style and a boolean `disabled` prop
export const StyledLink = ({ disabled, children, onClick: onClickProp=noop, ... restProps }) => {
  const onClick = useCallback ((event) => {
    if (disabled) return event.preventDefault ()
    return onClickProp (event)
  }, [disabled, onClickProp])
  return <LinkS disabled={disabled} onClick={onClick} {... restProps}>
    {children}
  </LinkS>
}

export const Link = ({ children, to: toProp, preserveQueryParams=false, withArrow=false, ... rest }) => {
  const to = (ok (toProp) && preserveQueryParams) ? (toProp + document.location.search) : toProp
  return <LinkReal to={to} {... rest}>
    {withArrow && <Arrow/>}
    {children}
  </LinkReal>
}
