import {
  pipe, compose, composeRight,
  path, noop, ok,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import { FormattedMessage, } from 'react-intl'
import { connect, useDispatch, } from 'react-redux'
import { createStructuredSelector, } from 'reselect'
import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { logWith, trim, } from 'alleycat-js/es/general'
import { allV, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'
import { media, mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import { queryUpdated, } from './actions'
import reducer from './reducer'
import saga from './saga'
import { selectResults, } from './selectors'

import { Input, } from '../../components/shared/Input'
import { DropDown, } from '../../components/shared'

import { container, effects, isNotEmptyString, useWhy, whenIsNotEmptyString, requestIsLoading, requestResults, } from '../../common'
import config from '../../config'

const targetValue = path (['target', 'value'])

const SearchS = styled.div`
  > * {
    vertical-align: middle;
  }
  > .x__wrapper {
    width: 50%;
    margin: auto;
    position: relative;
    > .x__zoeken {
      position: absolute;
      border-radius: 10px;
      cursor: pointer;
      left: 550px;
      padding: 10px;
      background: white;
      margin-left: 20px;
      &.x--disabled {
        cursor: inherit;
        > .x__text {
          opacity: 0.6;
        }
      }
    }
  }
  > .x__results-wrapper {
    position: relative;
    z-index: 2;
    width: 500px;
    margin: auto;
    > .x__results {
      position: absolute;
      width: 100%;
      min-height: 500px;
    }
  }
`

const dispatchTable = {
  queryUpdatedDispatch: queryUpdated,
}

const selectorTable = {
  results: selectResults,
}

export default container (
  ['Search', dispatchTable, selectorTable],
  (props) => {
    const { queryUpdatedDispatch, results: resultsRequest, } = props
    const [query, setQuery] = useState ('')
    const onChange = useCallbackConst (targetValue >> trim >> effects ([
      setQuery,
      queryUpdatedDispatch,
    ]))
    const canSearch = useMemo (() => query | isNotEmptyString, [query])
    const zoekenCls = clss ('x__zoeken', canSearch || 'x--disabled')

    const results = useMemo (
      () => resultsRequest | requestResults ({ onLoading: noop, }),
      [resultsRequest],
    )
    const hasResults = ok (results)
    const isLoading = useMemo (
      () => resultsRequest | requestIsLoading,
      [resultsRequest],
    )
    const hasQuery = useMemo (
      () => query | isNotEmptyString,
      [query],
    )
    const showResults = useMemo (
      () => allV (hasQuery, hasResults || isLoading),
      [hasQuery, hasResults, isLoading],
    )

    useWhy ('Search', props)
    useReduxReducer ({ createReducer, reducer, key: 'Search', })
    useSaga ({ saga, key: 'Search', })

    return <SearchS>
      <div className='x__wrapper'>
        <Input
          withIcon={['search', 'left']}
          height='100%'
          padding='16px'
          style={{ display: 'inline-block', }}
          inputStyle={{
            fontSize: '25px',
            border: '2px solid black',
            borderRadius: '1000px',
            background: 'white',
          }}
          onChange={onChange}
          value={query}
        />
        <span className={zoekenCls}><span className='x__text'>zoeken</span></span>
      </div>
      <div className='x__results-wrapper'>
        <div className='x__results'>
          <DropDown
            open={showResults}
            wrapperStyle={{ minHeight: '300px', }}
            contentsStyle={{ height: '100%', }}
          >
            {results}
          </DropDown>
        </div>
      </div>
    </SearchS>
  }
)
