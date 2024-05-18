import {
  pipe, compose, composeRight,
  blush, ifOk, id, guard, otherwise,
  eq, condS, prop, join, mergeToM, noop, guardV,
  lets, sprintfN,
} from 'stick-js/es'

import React, {} from 'react'

import styled from 'styled-components'

import SpinnerTextblocksC from './SpinnerText'
import SpinnerCometC from './SpinnerComet'

import { lookupOnOrDie, } from '../util-general'

import imageCat from './images/cat-red.png'

const ButtonS = styled.button`
  border: 1px solid black;
  border-radius: 2px;
  background: #EEE;
  padding: 2px;
  &:not(:disabled) {
    cursor: pointer;
    .overlay {
      display: none;
    }
  }
  .overlay {
    opacity: 0.5;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0px;
    left: 0px;
  }

  display: inline-block;
  &:active {
    border-style: solid;
    transition: all .03s;
    transform: translateY(1px) translateX(1px);
    opacity: 0.8;
  }
  &:focus {
    outline: none;
  }

`

export const Button = ({ onClick, disabled, style={}, children, }) => <ButtonS
  onClick={onClick}
  disabled={disabled}
  style={style}
>
  <div className='overlay'/>
  {children}
</ButtonS>

const IconFAS = styled.div`
  display: inline-block;
`

export const IconFA = ({ icon, style = {}, }) => <IconFAS>
  <i
    className={'fa ' + icon}
	style={style}
  />
</IconFAS>

const FooterS = styled.div`
  font-size: 10px;
  color: black;
  position: relative;
  top: 8%;
  margin: auto;
  height: 21px;
  > a {
    display: inline-block;
    width: 100%;
    text-align: center;
    color: initial;
    text-decoration: none;
    > .x__text {
      vertical-align: baseline;
    }
    > .x__logo {
      img { width: 60px; }
      position: absolute;
      right: -22px;
      top: -11px;
    }
    > .x__separator, .x__separator-outer {
      padding-left: 7px;
      padding-right: 7px;
    }
    > .x__link {
      vertical-align: baseline;
      display: inline-block;
      &:hover {
        border-bottom: 1px solid black;
      }
      > a {
        text-decoration: none;
        // font-weight: bold;
        color: black;
      }
    }
  }
`

const AlleyCatFooterSimple = ({ style={}, textStyle={}, linkStyle={}, ... restProps }) => {
  const separatorOuter = ['٭', '٭']
  return <FooterS
    {... restProps}
    style={style}
  >
  <a target="_blank" rel="noopener noreferrer" href="https://alleycat.cc">
    <span className='x__separator-outer'>
      {separatorOuter [0]}
    </span>
    <span className='x__text' style={textStyle}>
      Site by AlleyCat Amsterdam
    </span>
    <span className='x__logo'>
      <img src={imageCat}/>
    </span>
    <span className='x__separator'>
      |
    </span>
    <span className='x__link' style={linkStyle}>
      alleycat.cc
    </span>
    <span className='x__separator-outer'>
      {separatorOuter [1]}
    </span>
  </a>
  </FooterS>
}

// --- only 'simple' for now
export const AlleyCatFooter = ({ type='simple', ... restProps }) => type | lookupOnOrDie (
  'bad type ' + type,
  { simple: <AlleyCatFooterSimple {... restProps}/>, },
)

const SpinnerWrapperS = styled.div`
  width: 10px;
  display: inline-block;
  @keyframes ac-spinner-wrapper {
    0% {
      opacity: 0;
    }
    99% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  animation-duration: ${prop ('delayMs')}ms;
  animation-name: ac-spinner-wrapper;
  ${({ keepVisible, spinning, }) => lets (
    () => spinning || keepVisible,
    (show) => show ? 'visibility: visible;' : 'visibility: hidden;',
  )}
`

const SpinnerTextblocks = ({ spinning=true, keepVisible=false, delayMs=0, ... restProps }) =>
  <SpinnerWrapperS spinning={spinning} keepVisible={keepVisible} delayMs={delayMs}>
    <SpinnerTextblocksC type='textblocks' spinning={spinning} {... restProps}/>
  </SpinnerWrapperS>

const SpinnerComet = ({ spinning=true, keepVisible=false, delayMs=100, style={}, ... restProps }) =>
  <SpinnerWrapperS spinning={spinning} keepVisible={keepVisible} delayMs={delayMs} style={style}>
    <SpinnerCometC spinning={spinning} {... restProps}/>
  </SpinnerWrapperS>

export const spinner = condS ([
  'textblocks' | eq | guardV (SpinnerTextblocks),
  'comet'      | eq | guardV (SpinnerComet),
  otherwise         | guard  (_ => spinner ('textblocks')),
])

const FontAwesomeS = styled.span`
  font-family: 'FontAwesome';
`

export const FontAwesome = ({ i, }) => {
  const className = ['fas', 'fa-' + i] | join (' ')
  return <FontAwesomeS className={className} />
}

export const LoadableLoading = (props) => {
  const { error, } = props
  if (!error) return null
  return <div>
    <p>
      Error: {error.toString ()}
    </p>
    <p>
      Stack: {error.stack.toString ()}
    </p>
  </div>
}
