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

export const Footer = styled.div`
  font-size: 11px;
  color: black;
  margin: auto;
  width: ${prop ('width') >> ifOk (id) (_ => 'inherit')};
  height: ${prop ('height') >> ifOk (id) (_ => 'inherit')};
  text-align: center;
  height: 21px;
`

const alleyCatFooterSimple = (props) => <Footer {...props}>
  Site by AlleyCat Amsterdam | <a
    target="_blank"
    rel="noopener noreferrer"
    href="http://alleycat.cc"
  >alleycat.cc</a>
</Footer>

export const alleyCatFooter = condS ([
  'simple' | eq | guard (() => alleyCatFooterSimple),
  otherwise | guard (_ => 'simple' | alleyCatFooter),
])

const SpinnerWrapperS = styled.div`
  width: 10px;
  display: inline-block;
  ${({ keepVisible, spinning, }) => lets (
    () => spinning || keepVisible,
    (show) => show ? 'opacity: 1;' : 'opacity: 0;',
  )}
`

const SpinnerTextblocks = ({ spinning=true, keepVisible=false, ... restProps }) =>
  <SpinnerWrapperS spinning={spinning} keepVisible={keepVisible}>
    <SpinnerTextblocksC type='textblocks' spinning={spinning} {... restProps}/>
  </SpinnerWrapperS>

const SpinnerComet = ({ spinning=true, keepVisible=false, ... restProps }) =>
  <SpinnerWrapperS spinning={spinning} keepVisible={keepVisible}>
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
