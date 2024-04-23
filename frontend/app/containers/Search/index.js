import {
  pipe, compose, composeRight,
  path, noop, ok, join, map, not,
  sprintfN, nil, tap,
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

import { queryUpdated, searchFetch, searchReset, } from './actions'
import reducer from './reducer'
import saga from './saga'
import { selectResultsAutocomplete, selectResultsSearch, selectNumResultsSearch, } from './selectors'

import { Input, } from '../../components/shared/Input'
import InputWithAutocomplete from '../../components/shared/InputWithAutocomplete'
import { PaginationWrapper, } from '../../components/shared'
import mkPagination from '../../containers/shared/Pagination'

import { component, container, container2, useWhy, requestIsLoading, requestResults, } from '../../common'
import {
  effects, isNotEmptyString, whenIsNotEmptyString,
} from '../../util-general'

import config from '../../config'
const configTop = configure.init (config)
const paginationKey = configTop.get ('app.keys.Pagination.search')
const targetValue = path (['target', 'value'])

const Pagination = mkPagination (paginationKey)

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

const SearchResults = container2 (
  ['SearchResults'],
  (props) => {
    const searchResults = useSelector (selectResultsSearch)
    const numResultsSearch = useSelector (selectNumResultsSearch)
    return <div>
      <PaginationWrapper showTotal={true} numItems={numResultsSearch ?? 0} Pagination={Pagination}/>
      {searchResults | requestResults ({
        spinnerProps: { color: 'white', size: 60, delayMs: 400, },
          onError: noop,
          onResults: (results) => <>
            <SearchResultsS>
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
            </SearchResultsS>
          </>
      })}
    </div>
  }
)
export const Search = container (
  ['Search',
    {
      queryUpdatedDispatch: queryUpdated,
      searchFetchDispatch: searchFetch,
      searchResetDispatch: searchReset,
    },
    {
      results: selectResultsAutocomplete,
      numResultsSearch: selectNumResultsSearch,
      resultsSearch: selectResultsSearch,
    },
  ],
  (props) => {
    const {
      query: queryProp=null,
      showResults: showResultsProp,
      results: resultsRequest,
      resultsSearch,
      queryUpdatedDispatch, searchFetchDispatch, searchResetDispatch,
      numResultsSearch,
    } = props
    const navigate = useNavigate ()
    const [query, setQuery] = useState ('')
    // --- we want to distinguish the case of starting a new search, with a new query, and searching
    // on a different page or page size with the existing query. In the first case we want the text
    // about the number of results to disappear and get redrawn, and in the second case, we want the
    // whole pagination component to be as smooth as possible (just the numbers / texts change).
    // This will cause a slight flicker in the first case, but it's confusing if the old text
    // suddenly gets replaced by new text when the new results come in.
    const [isNewQuery, setIsNewQuery] = useState (false)
    useEffect (() => {
      if (ok (queryProp)) setQuery (decodeURIComponent (queryProp))
    }, [queryProp])
    // --- @todo change name
    const onChangeValue = useCallbackConst (effects ([
      setQuery,
      queryUpdatedDispatch,
    ]))
    const onChange = useCallbackConst (targetValue >> trim >> onChangeValue)
    const onClear = useCallbackConst (() => {
      onChangeValue ('')
      setSuggestions ([])
    })
    const startSearch = useCallback ((value) => {
      navigate ('/search/' + encodeURIComponent (value))
    }, [navigate])
    // --- after choosing autocomplete value or typing query and pressing enter
    const onSelect = useCallback ((value) => {
      setQuery (value)
      startSearch (value)
      if (value !== query) setIsNewQuery (true)
    }, [startSearch, query])
    const canSearch = useMemo (() => query | isNotEmptyString, [query])
    const zoekenCls = clss ('x__zoeken', canSearch || 'x--disabled')

    // --- the autocomplete results
    // @todo better name
    const results = useMemo (
      () => resultsRequest | requestResults ({
        onLoading: noop,
        onError: noop,
      }),
      [resultsRequest],
    )
    const [suggestions, setSuggestions] = useState (results)
    useEffect (() => { setSuggestions (results) }, [results])
    // const isLoading = useMemo (
      // () => resultsRequest | requestIsLoading,
      // [resultsRequest],
    // )
    // const hasQuery = useMemo (
      // () => query | isNotEmptyString,
      // [query],
    // )
    const showResults = useMemo (
      () => allV (
        showResultsProp,
        not (isNewQuery),
      ),
      [showResultsProp, isNewQuery],
    )
    useEffect (() => {
      if (nil (queryProp)) return
      searchResetDispatch ()
      searchFetchDispatch (decodeURIComponent (queryProp))
    }, [queryProp, searchFetchDispatch])

    useEffect (() => {
      setIsNewQuery (false)
    }, [resultsSearch])

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
          closeOnSelected={true}
          suggestions={suggestions}
          onChange={(event) => onChange (event)}
          onClear={onClear}
          onSelect={onSelect}
        />
        <span className={zoekenCls}><span className='x__text'>zoeken</span></span>
      </div>
      {showResults && <div className='x__search-results-wrapper'>
        <SearchResults/>
      </div>}
    </SearchS>
  }
)
