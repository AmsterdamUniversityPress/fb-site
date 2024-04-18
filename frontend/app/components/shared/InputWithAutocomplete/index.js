import {
  pipe, compose, composeRight,
  noop, map, whenOk, plus, minus, each,
  tap, mergeM,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useState, } from 'react'

import styled from 'styled-components'

import { clss, keyDownListenPreventDefault, } from 'alleycat-js/es/dom'
import { logWith, min, max, warn, trim, } from 'alleycat-js/es/general'
import { allV, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { Input as InputDefault, } from '../Input'
import { DropDown, } from '../../shared'
import { useWhy, mediaPhone, mediaTablet, mediaDesktop, component, effects, isNotEmptyString, isNotEmptyList, lookupOnOr, mapX, } from '../../../common'

const InputWithAutocompleteS = styled.div`
  text-align: left;
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
`

const Suggestion = ({
  data,
  selected=false,
  selectedStyle={},
  onSelect,
  onHoverIn=noop,
  onHoverOut=noop,
}) => {
  const onClick = useCallback (() => {
    onSelect ()
  }, [onSelect])
  return <SuggestionS>
    <div
      className={clss ('x__data', selected && 'x--selected')}
      style={selected ? selectedStyle : {}}
      onMouseOver={onHoverIn}
      onMouseOut={onHoverOut}
      onClick={onClick}
    >
      {data}
    </div>
  </SuggestionS>
}

export default component (
  ['InputWithAutocomplete', null],
  (props) => {
    const {
      Input=InputDefault, inputWrapperProps={},
      value: valueProp='',
      suggestions: suggestionsProp=null,
      closeOnSelected=false,
      suggestionStyle={},
      selectedSuggestionStyle={},
      onBlur: onBlurProp=noop,
      onChange: onChangeProp=noop,
      onClear=noop,
      onSelect: onSelectProp=noop,
    } = props
    const { inputProps={}, ... restInputWrapperProps } = inputWrapperProps
    const suggestions = useMemo (() => suggestionsProp ?? [], [suggestionsProp])
    const [value, setValue] = useState (valueProp)
    const [showSuggestions, setShowSuggestions] = useState (true)
    const [enteredValue, setEnteredValue] = useState (valueProp)
    // --- -1 means use the value, >= 0 means that idx of the suggestions.
    const [selectedIdx, setSelectedIdx] = useState (-1)
    // --- for hovering with the mouse, which should highlight the rows in the same way as selecting
    // one. Note that the user uses the arrow keys, the input changes, but when hovering, it
    // doesn't. We could make it so that the arrow keys don't change the input either, but this is
    // just a choice for now. Note also that -1 doesn't make sense for hoverIdx (in contrast to
    // selectedIdx).
    const [hoverIdx, setHoverIdx] = useState (null)
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
    const valueForIdx = useCallback ((idx) => {
      if (idx === -1) return enteredValue
      return idx | lookupOnOr (
        () => warn ('valueForIdx failed for:', String (idx), suggestions),
        suggestions,
      )
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
    const onSuggestionHoverIn = useCallback (
      (idx) => () => setHoverIdx (idx)
    )
    const onSuggestionHoverOut = useCallback (
      () => setHoverIdx (null)
    )
    // --- we do not want to depend on `valueForIdx` here, even though the linter complains.
    useEffect (() => {
      setValue (valueForIdx (selectedIdx))
    }, [selectedIdx])
    const dropdownOpen = allV (
      showSuggestions,
      suggestions | isNotEmptyList,
    )
    const canKeyboard = dropdownOpen

    useEffect (() => { setValue (valueProp) }, [valueProp])
    useWhy ('InputWithAutocomplete', props)
    return <InputWithAutocompleteS>
      <Input
        inputProps={inputProps | mergeM ({ value, })}
        {... restInputWrapperProps}
        onChange={onChangeInput}
        onClear={onClear}
        onKeyDown={onKeyDownInput}
        onBlur={onBlur}
      />
      <div className='x__dropdown-wrapper'>
        <DropDown
          open={dropdownOpen}
          contentsStyle={{ minHeight: '300px', height: '100%', padding: '0px', paddingTop: '10px', paddingBottom: '10px', }}
        >
          {suggestions | mapX ((result, idx) => <Suggestion
            // --- @todo better id for key
            key={idx}
            data={result}
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
  },
)
