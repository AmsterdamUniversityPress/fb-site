import {
  pipe, compose, composeRight,
  ifTrue, blush, ifOk, id,
  guard, otherwise,
  ok, eq, invoke,
  condS,
  concat, prop,
  join, mergeToM, noop, guardV,
} from 'stick-js/es'

import React, { PureComponent, } from 'react'
import styled from 'styled-components'

import { ElemP, } from 'alleycat-js/es/react'

import SpinnerTextblocksC from './SpinnerText'
import SpinnerCometC from './SpinnerComet'

const InputS = styled.input`
  border-style: inset;
  padding: 1px;
  width: ${ prop ('width') >> ifOk (
    id, '100%' | blush,
  )};
`

export const Input = ElemP (InputS)

export const TextArea = ({ onChange=noop, defaultValue='', }) => <TextAreaS
  onChange={onChange}
  defaultValue={defaultValue}
/>

const TextAreaS = styled.textarea`
  border: 1px inset #111;
  padding: 2px;
  height: ${ prop ('height') >> ifOk (
    id, '200px' | blush,
  )};
  width: ${ prop ('width') >> ifOk (
    id, '100%' | blush,
  )};
`

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

/*
const TooltipComponentS = styled (TooltipComponent)`
`

export const Tooltip = ({ placement, overlay, children, }) => <TooltipComponentS
  placement={placement}
  overlay={overlay}
>
  <div style={{display: 'inline-block'}}>
    {children}
  </div>
</TooltipComponentS>
*/

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
  display: inline-block;
  opacity: ${({ keepVisible, spinning, }) =>
    (spinning || keepVisible) ? 1 : 0
  };
`

const SpinnerTextblocks = (props) => <SpinnerWrapperS {... (props | mergeToM ({ spinning: true, }))}>
  <SpinnerTextblocksC type='textblocks' {...(props | mergeToM ({ spinning: true, }))}/>
</SpinnerWrapperS>

const SpinnerComet = (props) => <SpinnerWrapperS {... { spinning: true, ...props, }}>
  <SpinnerCometC {... { spinning: true, ...props, }}/>
</SpinnerWrapperS>

export const spinner = condS ([
  'textblocks' | eq | guardV (SpinnerTextblocks),
  'comet'      | eq | guardV (SpinnerComet),
  otherwise         | guard  (_ => 'simple' | spinner),
])

/*
const tabsNavIdSwiper = (props) => <NavIdSwiper {... props} />

// --- String (type) -> <Tabs>
export const tabs = condS ([
  'nav-id-swiper' | eq | guardV (tabsNavIdSwiper),
  otherwise       |      guard  (_ => 'nav-id-swiper' | tabs),
])
*/

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
