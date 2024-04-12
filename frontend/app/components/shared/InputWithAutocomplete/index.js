import {
  pipe, compose, composeRight,
  noop, map, whenOk, plus, minus,
} from 'stick-js/es'

import React, { Fragment, memo, useCallback, useEffect, useRef, useState, } from 'react'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, keyDownListenPreventDefault, } from 'alleycat-js/es/dom'
import { logWith, min, max, } from 'alleycat-js/es/general'
import { allV, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { mediaQuery, } from 'alleycat-js/es/styled'

import { Input as InputDefault, } from '../Input'
import { DropDown, } from '../../shared'
import { useWhy, mediaPhone, mediaTablet, mediaDesktop, component, isNotEmptyList, mapX, } from '../../../common'
import config from '../../../config'

const configTop = config | configure.init

const InputWithAutocompleteS = styled.div`
  text-align: left;
  .x__dropdown-wrapper {
    position: absolute;
    width: 100%;
    z-index: 2;
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
  onSelect: onSelectProp,
}) => {
  const [selected, setSelected] = useState (selectedProp)
  useEffect (() => { setSelected (selectedProp) }, [selectedProp])
  const onMouseOver = useCallbackConst (() => setSelected (true))
  const onMouseOut = useCallbackConst (() => setSelected (selectedProp))
  return <SuggestionS>
    <div
      className={clss ('x__data', selected && 'x--selected')}
      style={selected ? selectedStyle : {}}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onClick={onSelectProp}
    >
      {data}
    </div>
  </SuggestionS>
}

export default component (
  ['InputWithAutocomplete', null],
  (props) => {
    const {
      Input=InputDefault, inputProps={},
      value: valueProp='',
      suggestions: suggestionsProp=null,
      closeOnSelected=false,
      suggestionStyle={},
      selectedSuggestionStyle={},
      onBlur: onBlurProp=noop,
      onChange: onChangeProp=noop,
    } = props
    const suggestions = suggestionsProp ?? []
    const [value, setValue] = useState (valueProp)
    const [showSuggestions, setShowSuggestions] = useState (false)
    const [enteredValue, setEnteredValue] = useState (valueProp)
    // --- -1 means use the value, >= 0 means that idx of the suggestions.
    const [selectedIdx, setSelectedIdx] = useState (-1)
    const onChangeInput = useCallback ((event) => {
      setValue (event.target.value)
      setEnteredValue (event.target.value)
      setShowSuggestions (true)
      onChangeProp (event)
    }, [onChangeProp])
    const onKeyDownInput = useCallback (
      (event) => {
        event | keyDownListenPreventDefault (
          'ArrowDown',
          () => setSelectedIdx (plus (1) >> min (suggestions.length - 1)),
        )
        event | keyDownListenPreventDefault (
          'ArrowUp',
          () => setSelectedIdx (minus (1) >> max (-1)),
        )
      },
    )
    const onBlur = useCallbackConst (
      () => setShowSuggestions (false),
    )
    const onSelect = useCallbackConst (
      (idx) => () => {
        setSelectedIdx (idx)
        if (closeOnSelected) setShowSuggestions (false)
      }
    )
    useEffect (() => {
      if (selectedIdx === -1) setValue (enteredValue)
      else setValue (suggestions [selectedIdx])
    }, [selectedIdx])
    const dropdownOpen = allV (
      showSuggestions,
      suggestions | isNotEmptyList,
    )

    useEffect (() => { setValue (valueProp) }, [valueProp])
    useWhy ('InputWithAutocomplete', props)
    return <InputWithAutocompleteS>
      <Input {... inputProps}
        onChange={onChangeInput}
        onKeyDown={onKeyDownInput}
        onBlur={onBlur}
        value={value}
      />
      <div className='x__dropdown-wrapper'>
        <DropDown
          open={dropdownOpen}
          wrapperStyle={{ minHeight: '300px', }}
          contentsStyle={{ height: '100%', padding: '0px', paddingTop: '10px', paddingBottom: '10px', }}
        >
          {suggestions | mapX ((result, idx) => <Suggestion
            key={idx}
            data={result}
            selected={idx === selectedIdx}
            onSelect={onSelect (idx)}
            style={suggestionStyle}
            selectedStyle={selectedSuggestionStyle}
          />)}
        </DropDown>
      </div>
    </InputWithAutocompleteS>
  },
)
