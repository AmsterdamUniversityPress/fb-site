import {
  pipe, compose, composeRight,
  map, repeatF, modulo, tap, ok, not, noop,
} from 'stick-js/es'

import React, {  memo, useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { logWith, setTimeoutOn, } from 'alleycat-js/es/general'
import {} from 'alleycat-js/es/react'

import { useWhy, mediaPhone, mediaTablet, mediaDesktop, component, } from '../../common'
import config from '../../config'

import ImageText from '../../images/hero-text-svg'

const configTop = config | configure.init
const imageE = configTop.get ('images.hero-e')
const imageText = configTop.get ('images.hero-text')

const [[ll, lr], [tl, tr]] = [
  [-20, 20], [-20, 20],
]

const colors = [
  '90a6a7ff',
  'f9b1afff',
  'fdacaaff',
  'b4ababff',
  '95acacff',
  'f7a8a6ff',
  '93aaaaff',
  '8fababff',
  '472e2eff',
  'c62e2eff',
]
const randomColor = () => '#' + colors [Math.floor (Math.random () * colors.length)]

const BlockS = styled.div`
  display: inline-block;
  position: relative;
  transition: width .5s, height .5s;
  .x__img, .x__overlay {
  }
  .x__img {
    img {
      box-shadow: 1px 1px 2px 2px black;
      height: 90%;
      width: 90%;
      position: relative;
      z-index: 2;
    }
  }
  .x__overlay {
    height: 100%;
    width: 100%;
    position: absolute;
    transition: left .5s, top .5s, opacity .5s;
    z-index: 1;
  }
`

const Block = ({ color, left, top, opacity, blockWidth='40px', blockHeight='40px', }) => <BlockS style={{ height: blockHeight, width: blockWidth, }}>
  <div className='x__img' style={{
    opacity,
  }}>
    <img src={imageE}/>
  </div>
  <div className='x__overlay' style={{
    left, top,
    background: color,
    opacity: 1,
  }}/>
</BlockS>

const randInt = (x, y) => x + Math.floor (Math.random () * (y - x))

const HeroS = styled.div`
  position: relative;
  &.x--assembled {
    width: 100%;
    > .x__blocks {
      width: 100%;
    }
    > .x__text {
      display: initial;
    }
    > .x__background {
      display: initial;
    }
  }
  > .x__background {
    display: none;
    transform: skew(2deg, 2deg);
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: 0;
    background: black;
  }
  > .x__blocks {
    z-index: 1;
    margin: auto;
    width: 50%;
    transition: width .5s;
    > .x__row {
      white-space: nowrap;
      line-height: 0px;
    }
  }
  > .x__text {
    display: none;
    z-index: 1;
    position: absolute;
    top: 100px;
    left: 100px;
    z-index: 3;
  }
`

export default component (
  ['Hero', null],
  (props) => {
    const { rows, cols, blockWidth, blockHeight, go, onAssembled=noop, } = props
    const n = rows * cols
    const [assembled, setAssembled] = useState (false)
    const [lefts, setLefts] = useState (null)
    const [tops, setTops] = useState (null)
    const [opacity, setOpacity] = useState (null)
    const [widths, setWidths] = useState (null)
    const data = useMemo (() => {
      const ret = []
      ; (rows * cols) | repeatF (
        (m) => ret [m] = randomColor (),
      )
      return ret
    }, [n, rows, cols])
    const updateStep = useRef (0)

    useEffect (() => {
      if (updateStep.current >= 1) return
      setLefts ((rows * cols) | repeatF (
        () => randInt (ll, lr),
      ))
      setTops ((rows * cols) | repeatF (
        () => randInt (tl, tr),
      ))
      setOpacity (0)
      setWidths ((rows * cols) | repeatF (
        () => randInt (10, 30),
      ))
      updateStep.current = 1
    }, [rows, cols, go])

    useEffect (() => {
      if (not (go)) return
      if (not (lefts)) return
      if (updateStep.current >= 2) return
      // if (updateStep.current !== 1) return
      setLefts ((rows * cols) | repeatF (
        // () => 0,
        () => randInt (-10, 10),
      ))
      setTops ((rows * cols) | repeatF (
        // () => 0,
        () => randInt (-10, 10),
      ))
      setOpacity (1)
      setWidths ((rows * cols) | repeatF (
        // () => 40,
        () => randInt (35, 45),
      ))
      setAssembled (true)
      updateStep.current = 2
      500 | setTimeoutOn (() => onAssembled ())
    }, [lefts, rows, cols, go])

    useWhy ('Hero', props)
    return <HeroS className={clss (assembled && 'x--assembled')}>
      <div className='x__blocks'>
        {rows | repeatF (
          (row) => <div key={row} className='x__row'>{
            (updateStep.current >= 1) && (cols | repeatF (
              (col) => <Block
                key={col}
                color={data [row*cols + col]}
                left={lefts [row*cols + col] + 'px'}
                top={tops [row*cols + col] + 'px'}
                opacity={opacity}
                blockWidth={widths [row*cols + col] + 'px'}
                blockHeight={widths [row*cols + col] + 'px'}
              />,
            ))
          }</div>,
        )}
      </div>
      <div className='x__text'>
        <ImageText fill='white' width='700' height='700'/>
      </div>
      <div className='x__background'/>
    </HeroS>
  },
)
