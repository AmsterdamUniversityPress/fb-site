import {
  pipe, compose, composeRight,
  guard, otherwise, eq, condS, prop, guardV, lets,
} from 'stick-js/es'

import React, {} from 'react'

import styled from 'styled-components'

import SpinnerTextblocksC from './SpinnerText'
import SpinnerCometC from './SpinnerComet'

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
