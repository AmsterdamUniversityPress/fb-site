import {
  pipe, compose, composeRight,
  invoke, whenOk, prop, noop, not,
} from 'stick-js/es'

import React, { useCallback, useRef, useState, } from 'react'
import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { allV, } from 'alleycat-js/es/predicate'
import { useCallbackConst, withDisplayName, } from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { mediaPhone, mediaPhoneOnly, mediaTablet, mediaDesktop, } from '../../../common'
import { isNotEmptyString, isNotEmptyList, lookupOn, } from '../../../util-general'

import config from '../../../config'

const configTop = config | configure.init

const filterIcon = configTop.get ('icons.filter')
const searchIcon = configTop.get ('icons.search')
import Filter from '../../../images/icons/filter.svg.js'

// --- @todo styling is repeated here and SearchField.
const InputBaseMixin = `
  border: 1px solid #7c7c7c;
  height: 100%;
  width: 100%;
  :-ms-input-placeholder {
    color: #7c7c7c !important;
  }
  :focus {
    border: 2px solid #759fe6;
  }
  ${mediaQuery (
    mediaPhone (`font-size: 25px; `),
    mediaTablet (`font-size: 20px; `),
  )}
`

const InputS = styled.input`
  ${InputBaseMixin}
  ${({ padding, }) => padding | whenOk (() => `
    padding: ${padding};
    &.focus-fix {
      :focus {
        padding: calc(${padding} - 1px);
      }
    }
  `)}
`

const InputWrapperS = styled.div`
  position: relative;
  display: inline-block;
  > .x__icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 60%;
    img {
      height: 100%;
      // --- not sure why this is necessary but otherwise the image is too low
      vertical-align: top;
    }
    &.x--left {
      left: 15px;
    }
    &.x--right {
      right: 15px;
    }
    .icon {}
    .icon-filter {
    }
  }
  .x__clear-icon {
    position: absolute;
    display: inline-block;
    display: flex;
    align-items: center;
    right: 20px;
    font-size: 150%;
    cursor: pointer;
    height: 100%;
    overflow: hidden;
    opacity: 0.5;
    &:hover {
      opacity: 1;
    }
    > span {
    }
  }
  > .x__input {
  }
`

const InputWrapper = invoke (() => {
  const wheres = {
    left: 'x--left',
    right: 'x--right',
  }
  const styleForWhereIcon = {
    // --- padding + icon width
    left: { paddingLeft: '60px', },
    right: { paddingRight: '60px', },
  }
  const styleForClearIcon = (show) => not (show) ? null : {
    paddingRight: '47px',
  }
  const icons = (which, classes) => which | lookupOn ({
    filter: <Filter height='14px' className={clss ('icon', 'icon-filter', ... classes)}/>,
    search: <img src={searchIcon} className='icon icon-search'/>,
  })
  return (props) => {
    const {
      withIcon=[],
      showClearIcon=false,
      inputRef: inputRefProp=null,
      style={},
      doFocusFix=true,
      width,
      clear: clearProp={},
      onBlur=noop, onChange=noop, onClear=noop, onKeyDown=noop,
      inputProps={},
    } = props
    const { style: inputStyle={}, ... restInputProps } = inputProps
    const [icon, whereIcon, iconClasses=[]] = withIcon
    const hasIcon = withIcon | isNotEmptyList
    const inputRef = useRef (null)
    const theInputRef = inputRefProp ?? inputRef
    const onClickIcon = useCallback (() => {
      theInputRef.current | whenOk ((input) => input.focus ())
    }, [theInputRef])
    const clear = useCallback (() => {
      theInputRef.current.value = ''
      onClear ()
    }, [theInputRef, onClear])
    const onClickClear = clear
    clearProp.current = clear
    const showTheClearIcon = allV (
      showClearIcon,
      theInputRef.current | whenOk (prop ('value') >> isNotEmptyString)
    )
    const clsIcon = clss (
      'x__icon',
      wheres [whereIcon] || null,
    )
    const clsInput = 'x__input'
    inputStyle.padding ??= '16px'
    const { padding, ... restInputStyle } = inputStyle
    return <InputWrapperS style={{ width, ... style, }}>
      {hasIcon && <div className={clsIcon} onClick={onClickIcon}>
        {icons (icon, iconClasses) || null}
      </div>}
      {showTheClearIcon && <div className='x__clear-icon' onClick={onClickClear}>
        <span>
          ×
        </span>
      </div>}
      <div className={clsInput}>
        <InputS
          className={clss (doFocusFix && 'focus-fix')}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          {... restInputProps}
          ref={theInputRef}
          // --- this is for avoiding a weird jump / blue outline on mobile. It probably won't work
          // right if the caller gives varying values for paddingLeft, paddingRight, etc.
          // --- @todo the padding stuff is pretty terrible -- works for now but needs a rewrite.
          padding={inputStyle.padding}
          style={{
            ... restInputStyle,
            ... styleForClearIcon (showClearIcon),
            ... (styleForWhereIcon [whereIcon] || null),
          }}
        />
      </div>
    </InputWrapperS>
  }
})

export const Input = withDisplayName ('InputAuto') (
  (props) => {
    const { theRef, withIcon=[], height='35px', width='100%', padding='10px', } = props
    // --- @future this is quite messy with the props
    return <InputWrapper
      {...props}
      withIcon={withIcon}
      theRef={theRef}
      height={height} width={width} padding={padding}
    />
  },
)

export const InputText = (props) => <Input
  type='text'
  autoComplete='off'
  autoCorrect='off'
  autoCapitalize='off'
  spellCheck='false'
  {... props}
/>
