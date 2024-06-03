import {
  pipe, compose, composeRight,
  noop, map, whenOk, plus, minus, each,
  tap, mergeM,
} from 'stick-js/es'

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import styled from 'styled-components'

import { clss, keyDownListenPreventDefault, } from 'alleycat-js/es/dom'
import { logWith, min, max, warn, trim, } from 'alleycat-js/es/general'
import { allV, ifEquals, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { Input as InputDefault, } from '../Input'
import { DropDown, } from '../../shared'
import { useWhy, mediaPhone, mediaTablet, mediaDesktop, component, } from '../../../common'
import {
  effects, elementAt, isNotEmptyString, isNotEmptyList, lookupOnOr, mapX,
} from '../../../util-general'

const InputWithAutocompleteS = styled.div`
  text-align: left;
  position: relative;
  .x__dropdown-wrapper {
    position: absolute;
    width: 100%;
  }
`

const SuggestionS = styled.div`
  > * {
    white-space: break-spaces;
  }
  .x__data {
    padding-left: 10px;
    padding-right: 10px;
    &.x--selected {
      background: #ffcbcb6b;
    }
  }
  .x__highlight {
    font-weight: bold;
  }
`

const Suggestion = ({
  value,
  query=null,
  selected=false,
  selectedStyle={},
  onSelect,
  onHoverIn=noop,
  onHoverOut=noop,
}) => {
  const onClick = useCallback (() => {
    onSelect ()
  }, [onSelect])
  const highlight = useCallbackConst ((value, query) =>
    value.indexOf (query) | ifEquals (-1) (
      () => value,
      // --- the string is generally at the beginning (we only do autcomplete on prefixes, not in
      // the middle of a token), but we do it this way so we also catch something like
      // 'medisch-polemologische' for query 'pol'. It's still a bit flaky on edge cases, like for
      // exmmple 'tuinhuis-huishouden' with qeury 'huis' will highlight the first occurrence of
      // 'huis'. But probably good enough for this.
      (idx) => <>
        {value.substring (0, idx)}
        <span className='x__highlight'>{value.substr (idx, query.length)}</span>
        {value.slice (idx + query.length)}
      </>,
    )
  )
  return <SuggestionS>
    <div
      className={clss ('x__data', selected && 'x--selected')}
      style={selected ? selectedStyle : {}}
      onMouseOver={onHoverIn}
      onMouseOut={onHoverOut}
      onClick={onClick}
    >
      {highlight (value, query)}
    </div>
  </SuggestionS>
}

export default component (
  ['InputWithAutocomplete', null],
  forwardRef ((props, ref) => {
    const {
      Input=InputDefault, inputWrapperProps={},
      initValue: initValueProp=null,
      value: valueProp='',
      suggestions: suggestionsProp=null,
      closeOnSelected=false,
      suggestionStyle={},
      selectedSuggestionStyle={},
      onBlur: onBlurProp=noop,
      onChange: onChangeProp=noop,
      onClear: onClearProp=noop,
      onFocus,
      onSelect: onSelectProp=noop,
    } = props
    const { inputProps={}, ... restInputWrapperProps } = inputWrapperProps
    const suggestions = useMemo (() => suggestionsProp ?? [], [suggestionsProp])
    const [value, setValue] = useState (initValueProp ?? valueProp)
    useEffect (() => { setValue (initValueProp) }, [initValueProp])
    const [showSuggestions, setShowSuggestions] = useState (false)
    const [enteredValue, setEnteredValue] = useState (valueProp)
    // --- -1 means use the value, >= 0 means that idx of the suggestions.
    const [selectedIdx, setSelectedIdx] = useState (-1)
    // --- for hovering with the mouse, which should highlight the rows in the same way as selecting
    // one. Note that the user uses the arrow keys, the input changes, but when hovering, it
    // doesn't. We could make it so that the arrow keys don't change the input either, but this is
    // just a choice for now. Note also that -1 doesn't make sense for hoverIdx (in contrast to
    // selectedIdx).
    const [hoverIdx, setHoverIdx] = useState (null)
    const clear = useRef (null)

    const dropdownOpen = allV (
      showSuggestions,
      suggestions | isNotEmptyList,
    )
    const canKeyboard = dropdownOpen

    const onChangeInput = useCallback ((event) => {
      const { value, } = event.target
      setValue (value)
      setEnteredValue (value)
      setShowSuggestions (value | trim | isNotEmptyString)
      onChangeProp (event)
    }, [onChangeProp])
    const _onSelect = useCallback (
      (theValue) => {
        if (theValue !== '') onSelectProp (theValue)
        if (closeOnSelected) setShowSuggestions (false)
      },
      [onSelectProp, closeOnSelected],
    )
    const onClear = useCallback (() => {
      setValue ('')
      onClearProp ()
    }, [setValue, onClearProp])
    const valueForIdx = useCallback ((idx) => {
      if (idx === -1) return enteredValue
      return idx | lookupOnOr (
        () => warn ('valueForIdx failed for:', String (idx), suggestions),
        suggestions,
      ) | whenOk (elementAt (0))
    }, [enteredValue, suggestions])
    const onSelectWithPointer = useCallback (
      (idx) => () => {
        setSelectedIdx (idx)
        _onSelect (valueForIdx (idx))
      },
      [_onSelect, valueForIdx],
    )
    const onSelectWithKeyboard = useCallback (
      () => _onSelect (value),
      [_onSelect, value],
    )
    const onKeyDownInput = useCallback (
      (event) => event | effects ([
        keyDownListenPreventDefault (
          'ArrowDown',
          () => canKeyboard && setSelectedIdx (
            plus (1) >> min (suggestions.length - 1),
          ),
        ),
        keyDownListenPreventDefault (
          'ArrowUp',
          () => canKeyboard && setSelectedIdx (
            minus (1) >> max (-1),
          ),
        ),
        keyDownListenPreventDefault (
          'Enter',
          () => onSelectWithKeyboard (),
        ),
        keyDownListenPreventDefault (
          // --- @todo doesn't seem to work (but clear.current () does)
          'Escape',
          () => {
            clear.current ()
          }
        ),
      ]),
      [canKeyboard, suggestions, onSelectWithKeyboard],
    )
    const onBlur = useCallbackConst (
      (event) => {
        onBlurProp (event)
        // --- @todo not working: if you click a suggestion, blur happens before click and click
        // gets ignored.
        // setShowSuggestions (false)
      },
    )
    const onSuggestionHoverIn = useCallbackConst (
      (idx) => () => setHoverIdx (idx),
    )
    const onSuggestionHoverOut = useCallbackConst (
      () => setHoverIdx (null)
    )
    // --- we do not want to depend on `valueForIdx` here, even though the linter complains.
    useEffect (() => {
      setValue (valueForIdx (selectedIdx))
    }, [selectedIdx])
    useEffect (() => {
      setSelectedIdx (-1)
      setHoverIdx (null)
    }, [suggestions])

    useEffect (() => { setValue (valueProp) }, [valueProp])
    useWhy ('InputWithAutocomplete', props)
    return <InputWithAutocompleteS>
      <Input
        ref={ref}
        inputProps={inputProps | mergeM ({ value, })}
        {... restInputWrapperProps}
        onChange={onChangeInput}
        onClear={onClear}
        onFocus={onFocus}
        clear={clear}
        onKeyDown={onKeyDownInput}
        onBlur={onBlur}
      />
      <div className='x__dropdown-wrapper'>
        <DropDown
          open={dropdownOpen}
          contentsStyle={{ minHeight: '300px', height: '100%', padding: '0px', paddingTop: '10px', paddingBottom: '10px', }}
        >
          {suggestions | mapX (([result, key], idx) => <Suggestion
            key={key}
            value={result}
            query={value}
            selected={idx === selectedIdx || idx == hoverIdx}
            style={suggestionStyle}
            selectedStyle={selectedSuggestionStyle}
            onSelect={onSelectWithPointer (idx)}
            onHoverIn={onSuggestionHoverIn (idx)}
            onHoverOut={onSuggestionHoverOut}
          />)}
        </DropDown>
      </div>
    </InputWithAutocompleteS>
  }),
)
