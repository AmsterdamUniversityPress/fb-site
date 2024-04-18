import {
  pipe, compose, composeRight,
  path, noop, ok, join, map, not,
  sprintfN,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import { useNavigate, } from 'react-router-dom'

import { useDispatch, useSelector, } from 'react-redux'
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
import { searchFetch } from '../App/actions/main'
import reducer from './reducer'
import saga from './saga'
import { selectResults, } from './selectors'

import {
  selectSearchResults,
} from '../App/store/domain/selectors'

import { Input, } from '../../components/shared/Input'
import InputWithAutocomplete from '../../components/shared/InputWithAutocomplete'
import { DropDown, } from '../../components/shared'

import { component, container, container2, effects, isNotEmptyString, useWhy, whenIsNotEmptyString, requestIsLoading, requestResults, mapX, } from '../../common'
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
    z-index: 3;
    > .x__zoeken {
      position: absolute;
      border-radius: 10px;
      cursor: pointer;
      left: 550px;
      top: 5px;
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

export const Search = container (
  ['Search',
    {
      queryUpdatedDispatch: queryUpdated,
      searchFetchDispatch: searchFetch,
    },
    {
      results: selectResults,
    },
  ],
  (props) => {
    const { queryUpdatedDispatch, searchFetchDispatch, results: resultsRequest, } = props
    const [query, setQuery] = useState ('')
    const onChangeValue = useCallbackConst (effects ([
      setQuery,
      queryUpdatedDispatch,
    ]))
    const onChange = useCallbackConst (targetValue >> trim >> onChangeValue)
    const onClear = useCallbackConst (() => {
      onChangeValue ('')
      setSuggestions ([])
    })
    const navigate = useNavigate ()
    const onSelect = useCallback (() => {
      searchFetchDispatch (query)
      navigate ('/searchResults')
      onClear ()
    }, [searchFetchDispatch, query, navigate, onClear])
    const canSearch = useMemo (() => query | isNotEmptyString, [query])
    const zoekenCls = clss ('x__zoeken', canSearch || 'x--disabled')

    const results = useMemo (
      () => resultsRequest | requestResults ({
        onLoading: noop,
        onError: noop,
      }),
      [resultsRequest],
    )
    const [suggestions, setSuggestions] = useState (results)
    useEffect (() => { setSuggestions (results) }, [results])
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
          inputWrapperProps={{
            withIcon: ['search', 'left'],
            showCloseIcon: true,
            style: { display: 'inline-block', },
            inputProps: {
              autoFocus: true,
              style: {
                height: '100%',
                fontSize: '25px',
                border: '2px solid black',
                borderRadius: '1000px',
                background: 'white',
              },
            },
          }}
          onChange={(event) => onChange (event)}
          onClear={onClear}
          onSelect={onSelect}
          suggestions={suggestions}
        />
        <span className={zoekenCls}><span className='x__text'>zoeken</span></span>
      </div>
      {/*
      // @todo remove redundant code
      <div className='x__results-wrapper'>
        {showResults && <div className='x__results'>
          <DropDown
            open={false}
            contentsStyle={{ minHeight: '300px', height: '100%', }}
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
          */}
    </SearchS>
  }
)

const SearchResultsS = styled.div`
  background: white;
  width: 80%;
  min-width: 100px;
  > .x__wrapper {
    padding: 3%;
    > .x__name {
      font-weight: bold;
      font-size: 25px;
      display: inline-block;
    }
    > .x__type {
      display: inline-block;
      margin-left: 4px;
      font-weight: bold;
      font-size: 25px;
    }
    > .x__match {
      text-align: centre;
      > .highlight {
        background: yellow;
      }
    }

  }
`

export const SearchResults = container2 (
  ['SearchResults'],
  () => {
    const searchResults = useSelector (selectSearchResults)
    return <>
      <div className='x__search'>
        <Search/>
      </div>
      <SearchResultsS>
        {searchResults | requestResults ({
          spinnerProps: { color: 'white', size: 60, delayMs: 400, },
            onError: noop,
            onResults: (results) => <>
              {results | map (
                ({ uuid, name, type, match }) => <div className='x__wrapper 'key={uuid}>
                  <div className='x__name'>{name}</div>
                  <div className='x__type'>{[type] | sprintfN ("(%s)")}</div>
                  <div
                    className='x__match'
                    // --- @todo
                    dangerouslySetInnerHTML={{__html: match}}
                  />
                </div>
              )}
            </>
        })}
      </SearchResultsS>
    </>
  }
)
