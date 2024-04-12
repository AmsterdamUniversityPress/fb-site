import {
  pipe, compose, composeRight,
  path, noop, ok, join, map, not,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import { Link, } from 'react-router-dom'

import { FormattedMessage, } from 'react-intl'
import { connect, useDispatch, } from 'react-redux'
import { createStructuredSelector, } from 'reselect'
import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { logWith, trim, } from 'alleycat-js/es/general'
import { allV, isEmptyList, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'
import { media, mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import { queryUpdated, } from './actions'
import reducer from './reducer'
import saga from './saga'
import { selectResults, } from './selectors'

import { Input, } from '../../components/shared/Input'
import InputWithAutocomplete from '../../components/shared/InputWithAutocomplete'
import { DropDown, } from '../../components/shared'

import { container, effects, isNotEmptyString, useWhy, whenIsNotEmptyString, requestIsLoading, requestResults, mapX, } from '../../common'
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
    text-align: left;
    position: relative;
    z-index: 2;
    width: 500px;
    margin: auto;
    > .x__results {
      overflow-x: hidden;
      overflow-y: hidden;
      position: absolute;
      width: 100%;
      min-height: 500px;
      .x__result-wrapper {
        a {
          text-decoration: none;
          color: inherit;
        }
        &:hover {
          background: #EEE;
        }
        .x__result {
          padding-top: 15px;
          padding-bottom: 15px;
        }
        .x__separator {
          height: 1px;
          background: #AAA;
          width: 60%;
        }
      }
    }
  }
`

const ResultS = styled.div`
  > * {
    white-space: break-spaces;
  }
  .x__word {
    // text-decoration: underline;
    // opacity: 0.8;
  }
`

const Result = ({ word, }) => <ResultS>
  <div className='x__word'>{word}</div>
</ResultS>

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
    const hasResults = ok (results) && not (isEmptyList (results))
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
        <InputWithAutocomplete
          Input={Input}
          inputProps={{
            withIcon: ['search', 'left'],
            height: '100%',
            padding: '16px',
            style: { display: 'inline-block', },
            inputStyle: {
              fontSize: '25px',
              border: '2px solid black',
              borderRadius: '1000px',
              background: 'white',
            },
          }}
          onChange={(value) => onChange (value)}
          // onSubmit={(value) => }
          suggestions={results}
        />
        <span className={zoekenCls}><span className='x__text'>zoeken</span></span>
      </div>
      <div className='x__results-wrapper'>
        {showResults && <div className='x__results'>
          <DropDown
            open={false}
            wrapperStyle={{ minHeight: '300px', }}
            contentsStyle={{ height: '100%', }}
          >
            {results | mapX (
              (word, idx) =>
                <div key={idx} className='x__result'>
                  <Result word={word}/>
                </div>
            )}
          </DropDown>
        </div>}
      </div>
    </SearchS>
  }
)
