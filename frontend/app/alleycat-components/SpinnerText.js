import {
  pipe, compose, composeRight,
  ifTrue, blush, ifOk, id,
  guard, otherwise,
  ok, eq, invoke,
  condS,
  concat, prop,
  join,
  mergeM,
  side, side1,
  defaultTo,
  tap, deconstruct,
  lets,
  cond, T, noop,
  rangeToBy, sprintf1,
  appendM,
  take, rangeTo, map, sprintfN, split,
} from 'stick-js/es'

import React, { PureComponent, Component, } from 'react'

import styled from 'styled-components'

import { flatMap, } from 'alleycat-js/es/bilby'
import { iwarn, logWith, zipWithN, mapX, } from 'alleycat-js/es/general'
import { compMeth, } from 'alleycat-js/es/react-legacy'

const spins = {
  'textblocks': '⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆' | split (''),
}

const WrapperS = styled.div`
  white-space: nowrap;
  font-size: ${'fontSize' | prop};
  overflow-x: hidden;
`

const chop = xs => xs | take (xs.length - 1)

// --- examples are for n = 3
const makeKeyframes = n => width => lets (
  // --- [0, 33, 67, 100]
  () => 0 | rangeToBy (100 / n) (100) | appendM (100),
  // --- [0, 32, 33, 66, 67, 99]
  ([x, ...xs]) => [x, ... (xs | flatMap ((x) => [x - 0.0001, x]) | chop)],
  // --- [0, 0, -10, -10, -20, -20]
  () => 0 | rangeTo (n) | flatMap ((x) => [-x*width, -x*width]),
  (_, xs, ys) => [xs, ys] | zipWithN (
    (x, y) => [x, y] | sprintfN (`%s%% {
      left: %spx;
    }`)
  )
  | join ('\n')
  | sprintf1 (`@keyframes text {
    %s
  }`),
)

const width = 10

const InnerS = styled.div`
  width: 10px;
  animation-duration: 1.5s;
  animation-name: text;
  animation-iteration-count: infinite;
  position: relative;
  > * {
    display: inline-block;
    width: 10px;
  }
  ${'keyframes' | prop}
`

export default class SpinnerText extends PureComponent {
  spins = lets (
    () => this.props.type,
    (type) => spins [type] | defaultTo (() =>
      spins ['textblocks'] | tap (
        _ => iwarn ('Invalid spin type: ' + type)
      ),
    ),
  )

  keyframes = makeKeyframes (this.spins.length) (width)

  // --- just setting state isn't enough to force a render for some reason (maybe they are getting
  // batched or there is something else going on with setInterval).
  // --- we need to call forceUpdate, so we just skip state entirely and store the idx in this.

  render = () => this | compMeth ((
    { fontSize='12px', style={}, }, {}, { keyframes, spins, }
  ) => <WrapperS fontSize={fontSize} style={style}>
    <InnerS keyframes={keyframes}>
        {
          spins | mapX ((x, idx) => <div key={idx}>{x}</div>)
        }
    </InnerS>
  </WrapperS>
  )
}
