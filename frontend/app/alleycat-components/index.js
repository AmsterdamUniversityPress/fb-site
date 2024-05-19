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
  margin: auto;
  height: 21px;
  &.theme1 {
    font-size: 16px;
    width: 440px;
    margin: auto;
    overflow: hidden;
    box-shadow: 1px 1px 2px 1px;
    height: 30px;
    background: white;
    .x__link {
      font-variant: small-caps;
    }
  }
  > a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    color: initial;
    text-decoration: none;
    &:hover {
      > .x__link {
        > span {
          border-bottom: 1px solid black;
          top: 0px;
        }
      }
    }
    > * > .vtop {
      vertical-align: top;
    }
    > * > .vtext-bottom {
      vertical-align: text-bottom;
    }
    > .x__text {
      flex: 0 0 auto;
    }
    > .x__logo {
      img { width: 60px; }
      position: absolute;
      top: -9px;
      right: -22px;
    }
    > .x__separator, .x__separator-outer {
      padding-left: 7px;
      padding-right: 7px;
    }
    > .x__link {
      > span {
        display: inline-block;
        position: relative;
        top: -.5px;
      }
    }
  }
`

const AlleyCatFooterSimple = ({ style={}, textStyle={}, linkStyle={}, ... restProps }) => {
  const separatorOuter = ['٭', '٭']
  return <FooterS
    {... restProps}
    className='theme1'
    style={style}
  >
    <a target="_blank" rel="noopener noreferrer" href="https://alleycat.cc">
      <span className='x__separator-outer'>
        <span className='vtext-bottom'>
          {separatorOuter [0]}
        </span>
      </span>
      <span className='x__text' style={textStyle}>
        <span className='vtop'>
          Site by AlleyCat Amsterdam
        </span>
      </span>
      <span className='x__separator'>
        <span className='vtext-bottom'>
          |
        </span>
      </span>
      <span className='x__link' style={linkStyle}>
        <span className='vtext-bottom'>
          alleycat.cc
        </span>
      </span>
      <span className='x__separator-outer'>
        <span className='vtext-bottom'>
          {separatorOuter [1]}
        </span>
      </span>
      <span className='x__logo'>
        <img src={imageCat}/>
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
