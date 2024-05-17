import {
  pipe, compose, composeRight,
  map, repeatF, modulo, tap, ok, not,
} from 'stick-js/es'

import React, {  memo, useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { logWith, } from 'alleycat-js/es/general'
import { ifEquals, } from 'alleycat-js/es/predicate'
import {} from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { useWhy, mediaPhone, mediaTablet, mediaDesktop, component, } from '../../common'
import config from '../../config'

import ImageText from '../../images/hero-text-svg'

import { mapX, } from '../../util-general'

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
  .x__img, .x__overlay {
  }
  .x__img img {
    height: 90%;
    width: 90%;
    position: relative;
    z-index: 2;
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
    left, top, opacity,
    background: color,
  }}/>
</BlockS>

const randInt = (x, y) => x + Math.floor (Math.random () * (y - x))

const HeroS = styled.div`
  position: relative;
  > .x__blocks {
    > .x__row {
      line-height: 0px;
    }
  }
  > .x__text {
    position: absolute;
    top: 100px;
    left: 100px;
    z-index: 3;
  }
`

export default component (
  ['Hero', null],
  (props) => {
    const { rows, cols, blockWidth, blockHeight, } = props
    const n = rows * cols
    const [lefts, setLefts] = useState (null)
    const [tops, setTops] = useState (null)
    const [opacities, setOpacities] = useState (null)
    const data = useMemo (() => {
      const ret = []
      // const n = rows * cols
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
      setOpacities ((rows * cols) | repeatF (
        () => 0,
      ))
      updateStep.current = 1
    }, [rows, cols])

    useEffect (() => {
      if (not (lefts)) return
      if (updateStep.current >= 2) return
      // if (updateStep.current !== 1) return
      setLefts ((rows * cols) | repeatF (
        () => 0,
      ))
      setTops ((rows * cols) | repeatF (
        () => 0,
      ))
      setOpacities ((rows * cols) | repeatF (
        () => 1,
      ))
      updateStep.current = 2
    }, [lefts, rows, cols])

    useWhy ('Hero', props)
    return <HeroS>
      <div className='x__blocks'>
        {rows | repeatF (
          (row) => <div key={row} className='x__row'>{
            updateStep.current >= 1 && (cols | repeatF (
              (col) => <Block
                key={col}
                color={data [row*cols + col]}
                left={lefts [row*cols + col] + 'px'}
                top={tops [row*cols + col] + 'px'}
                opacity={opacities [row*cols + col]}
                blockWidth={blockWidth}
                blockHeight={blockHeight}
              />,
            ))
          }</div>,
        )}
      </div>
      <div className='x__text'>
        <ImageText fill='white' width='700' height='700'/>
      </div>
    </HeroS>
  },
)
