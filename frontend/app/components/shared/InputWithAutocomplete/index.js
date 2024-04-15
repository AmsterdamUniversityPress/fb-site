import {
  pipe, compose, composeRight,
  noop, map, whenOk, plus, minus, each,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useState, } from 'react'

import styled from 'styled-components'

import { clss, keyDownListenPreventDefault, } from 'alleycat-js/es/dom'
import { logWith, min, max, warn, } from 'alleycat-js/es/general'
import { allV, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { Input as InputDefault, } from '../Input'
import { DropDown, } from '../../shared'
import { useWhy, mediaPhone, mediaTablet, mediaDesktop, component, effects, isNotEmptyList, lookupOnOr, mapX, } from '../../../common'

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
  selected: selectedProp=false,
  selectedStyle={},
  onSelect,
}) => {
  const [selected, setSelected] = useState (selectedProp)
  useEffect (() => { setSelected (selectedProp) }, [selectedProp])
  const onMouseOver = useCallbackConst (() => setSelected (true))
  const onMouseOut = useCallbackConst (() => setSelected (selectedProp))
  const onClick = useCallback (() => onSelect (), [onSelect])
  return <SuggestionS>
    <div
      className={clss ('x__data', selected && 'x--selected')}
      style={selected ? selectedStyle : {}}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
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
    const suggestions = useMemo (() => suggestionsProp ?? [], [suggestionsProp])
    const [value, setValue] = useState (valueProp)
    const [showSuggestions, setShowSuggestions] = useState (true)
    const [enteredValue, setEnteredValue] = useState (valueProp)
    // --- -1 means use the value, >= 0 means that idx of the suggestions.
    const [selectedIdx, setSelectedIdx] = useState (-1)
    const onChangeInput = useCallback ((event) => {
      setValue (event.target.value)
      setEnteredValue (event.target.value)
      setShowSuggestions (true)
      onChangeProp (event)
    }, [onChangeProp])
    const _onSelect = useCallback (
      (theValue) => {
        onSelectProp (theValue)
        if (closeOnSelected) setShowSuggestions (false)
      },
      [onSelectProp, closeOnSelected],
    )
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
    const valueForIdx = useCallback ((idx) => {
      if (idx === -1) return enteredValue
      return idx | lookupOnOr (
        () => warn ('valueForIdx failed for:', String (idx), suggestions),
        suggestions,
      )
    }, [enteredValue, suggestions])
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
        {... inputWrapperProps}
        onChange={onChangeInput}
        onClear={onClear}
        onKeyDown={onKeyDownInput}
        onBlur={onBlur}
        value={value}
      />
      <div className='x__dropdown-wrapper'>
        <DropDown
          open={dropdownOpen}
          contentsStyle={{ minHeight: '300px', height: '100%', padding: '0px', paddingTop: '10px', paddingBottom: '10px', }}
        >
          {suggestions | mapX ((result, idx) => <Suggestion
            key={idx}
            data={result}
            selected={idx === selectedIdx}
            onSelect={onSelectWithPointer (idx)}
            style={suggestionStyle}
            selectedStyle={selectedSuggestionStyle}
          />)}
        </DropDown>
      </div>
    </InputWithAutocompleteS>
  },
)
