import {
  pipe, compose, composeRight,
  prop, whenTrue, sprintf1,
  ifOk, always,
  tap, id, lets, mergeTo,
  whenOk, concatTo,
  sprintfN,
  arg0,
} from 'stick-js/es'

import React, { PureComponent, } from 'react'
import styled from 'styled-components'
import { Link, } from 'react-router-dom'

import configure from 'alleycat-js/es/configure'
import { logWith, mapX, } from 'alleycat-js/es/general'
import { ifTrueV, whenTrueV, } from 'alleycat-js/es/predicate'
import { ElemP, deconstructProps, withDisplayName} from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { mediaPhone, mediaTablet, mediaDesktop, isMobileWidth, } from '../../common'

import { spinner, } from '../../alleycat-components'

import config from '../../config'

const configTop = config | configure.init

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
  &:focus {
    outline: none;
  }
`

export const ButtonS = styled (ButtonBaseS)`
  background: #f4f4f4;
  padding: 4px;
  position: relative;
  opacity: 0.5;
  &:not(:disabled) {
    opacity: 1.0;
    &:active {
      border-style: solid;
    }
  }
`

export const Button = (props) => <ButtonS type='submit' {...props}>
  <div>
  {props.children}
</div>
  {/* <div className='x__overlay'/> */}
</ButtonS>

export const Button2 = styled (ButtonBaseS)`
  border-radius: 5px;
  padding: 7px;
`

const RouterLinkS = styled (Link)`
  color: #bbb;
  text-decoration: none;
  cursor: pointer;
`

const RouterLinkDarkS = styled (RouterLinkS)`
  color: black;
`

export const BlueLink = styled (Link)`
  color: darkblue;
`

export const RouterLink = RouterLinkS
export const RouterLinkDark = RouterLinkDarkS

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

const linkBaseMixin = `
  text-decoration: underline;
  cursor: pointer;
`

const linkMixin = sprintf1 (`
  color: darkblue;
  ${linkBaseMixin}
`)

export const LinkLike = styled.span`
  ${linkMixin}
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
