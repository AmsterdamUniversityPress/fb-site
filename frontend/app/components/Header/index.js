import {
  pipe, compose, composeRight,
  map,
  sprintfN,
  tap,
  timesV, join, prop,
  not,
  side1,
  recurry,
  die,
  noop,
} from 'stick-js/es'

import React, { Fragment, memo, useCallback, useEffect, useRef, useState, } from 'react'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { logWith, nAtATime, zipWith3, mapX, } from 'alleycat-js/es/general'
import { ifTrueV, ifEquals, whenTrueV, } from 'alleycat-js/es/predicate'
import {} from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { useWhy, mediaPhone, mediaTablet, mediaDesktop, component, } from '../../common'
import config from '../../config'

const configTop = config | configure.init
const col = configTop.focus ('colors.header')
const { color1, color2, } = col.gets ('color1', 'color2')

const ColorsS = styled.div`
  * {
    display: inline-block;
    vertical-align: middle;
    width: 25px;
    height: 25px;
    border: 1px solid black;
  }
  div {
    background: ${color1};
  }
  span {
    background: ${color2};
  }
`

const Colors = () => <ColorsS>
  <div/><span/>
</ColorsS>

const HeaderS = styled.div`
  margin-bottom: 10px;
  div {
    display: inline-block;
  }
  > div:nth-child(1) {
    margin-right: 5px;
  }
`

export default component (
  ['Header', null],
  (props) => {
    const { counter, } = props
    useWhy ('Header', props)
    return <HeaderS>
      <div>
        theme colors
      </div>
      <Colors/>
    </HeaderS>
  },
)
