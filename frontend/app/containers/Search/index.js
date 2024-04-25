import {
  pipe, compose, composeRight,
  path, noop, ok, join, map, not,
  sprintfN, nil, tap,
  ifOk, dot, id, always,
  prop, whenOk, split,
  whenFalse,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import { useNavigate, } from 'react-router-dom'

import { useDispatch, useSelector, } from 'react-redux'
import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { logWith, trim, } from 'alleycat-js/es/general'
import { allV, } from 'alleycat-js/es/predicate'
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
import { PaginationAndExplanation, } from '../../components/shared'
import mkPagination from '../../containers/shared/Pagination'

import { component, container, container2, useWhy, requestIsLoading, requestResults, } from '../../common'
import {
  effects, isNotEmptyString, truncate, whenIsNotEmptyString,
} from '../../util-general'

import config from '../../config'
const configTop = configure.init (config)
const paginationKey = configTop.get ('app.keys.Pagination.search')
const imageEyeWall = configTop.get ('images.fonds')
const targetValue = path (['target', 'value'])

const Pagination = mkPagination (paginationKey)

const SearchS = styled.div`
  > * {
    vertical-align: middle;
  }
  > .x__search {
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
  > .x__search-results-wrapper {
    background: white;
    width: 95%;
    text-align: left;
    position: relative;
    margin-top: 40px;
    padding-top: 20px;
    /*
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
    */
    }
  }
`

const ResultsInnerS = styled.div`
  background: white;
  min-width: 100px;
  // display: flex;
  // flex-flow: row wrap;
`

const ResultsS = styled.div`
  > .x__pagination {
    > .x__separator {
      height: 1px;
      background: #000;
      width: 40%;
      margin: auto;
    }
  }
`

const ResultS = styled.div`
  width: 100%;
  min-width: 550px;
  padding: 3%;
  padding-right: 70px;
  font-size: 17px;
  display: flex;
  cursor: pointer;
  &:hover {
    background: #d2a89233;
    > .x__left {
      > .x__name {
        text-decoration: underline;
        }
      }
    }
  > .x__left {
    flex: 0 0 320px;
    margin-right: 40px;
    > .x__image {
      text-align: right;
      img {
        width: 320px;
      }
    }
    > .x__name {
      font-size: 19px;
      padding-top: 15px;
      font-family: Lora, serif;
      text-align: right;
      font-weight: bold;
      color: #4a001a;
    }
    > .x__categories {
      font-size: 14px;
      font-family: Lora, serif;
      text-align: right;
      padding-top: 8px;
    }
  }
  > .x__right {
    flex: 1 1 0px;
    > div {
      padding: 0.2%;
    }
    > .x__objective {
      padding-bottom: 2%;
    }
    > .x__type {
      display: none;
      // display: inline-block;
      margin-right: 4px;
    }
    > .x__categories {
      display: none;
    }
    .x__targetGroup {
      font-size: 15px;
      padding-right: 2%;
    }
    > .x__workingRegion {
      font-size: 15px;
    }
    > .x__match {
      display: none;
      > .highlight {
        background: yellow;
      }
    }
  }

`

// @todo: check how the results should be presented, and implement. There are a few display: none
// fields now, which can be cleaned up eventually. The highlight snippet is commented out: if we use
// it, we need some way to find out which other fields to show (e.g. we want to show (part of)
// 'doelstelling', but the snippet is often part of doelstelling. Then text appears double, which
// you don't want etc etc.
// @todo we need a better truncate function??
const Result = ({ imgSrc, uuid, name, type, targetGroup, workingRegion, objective, match, categories, }) => {
  const href = '/detail/' + uuid
  const navigate = useNavigate ()
  const onClick = useCallback (
    () => navigate (href),
    [navigate]
  )

  return <ResultS onClick={onClick}>
    <div className='x__left'>
      <div className='x__image'>
        <img src={imgSrc} />
      </div>
      <div className='x__name'>{name}</div>
      <div className='x__categories'>
        {[categories
            | map (dot ('toUpperCase')) | join (', ')
            | truncate (55)] | sprintfN ("%s")}
      </div>
    </div>
    <div className='x__right'>
      <div className='x__objective'> {[objective | split (' ') | truncate (30) | join (' ')] | sprintfN ("%s")}</div>
      <div className='x__type'>{[type] | sprintfN ("Type: %s")}</div>
      <div className='x__categories'>{[categories | join (', ')] | sprintfN ("%s")}</div>
      {targetGroup | whenOk (
        () => <div className='x__targetGroup'>{[targetGroup] | sprintfN ("Doelgroep: %s")}</div>
      )}
      {workingRegion | whenOk (
        () => <div className='x__workingRegion'>{[workingRegion] | sprintfN ("Werkregio: %s")} </div>
      )}
      <div
        className='x__match'
        // --- @todo
        dangerouslySetInnerHTML={{__html: match}}
      />
    </div>
  </ResultS>
}

const SearchResults = container2 (
  ['SearchResults'],
  (props) => {
    const { query, } = props
    const searchResults = useSelector (selectResultsSearch)
    const numResultsSearch = useSelector (selectNumResultsSearch)
    const imgSrc = imageEyeWall
    return <ResultsS>
      <div className='x__pagination'>
        <PaginationAndExplanation query={query} showExplanation={true} numItems={numResultsSearch ?? 0} Pagination={Pagination}/>
        <div className='x__separator'/>
      </div>
        {searchResults | requestResults ({
          spinnerProps: {
            color: 'black', size: 30, delayMs: 400,
            style: {
              marginLeft: '50%',
              marginTop: '30px',
              marginBottom: '30px',
            },
          },
          onError: noop,
          onResults: (results) => <>
            <ResultsInnerS>
              {results | map (
                ({ uuid, name, type, workingRegion, objective,  match, categories, targetGroup, }) => <Result
                  key={uuid}
                  imgSrc={imgSrc}
                  categories={categories}
                  match={match}
                  name={name}
                  objective={objective}
                  targetGroup={targetGroup}
                  type={type}
                  uuid={uuid}
                  workingRegion={workingRegion}
              />)}
            </ResultsInnerS>
          </>
        })}
    </ResultsS>
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
    const [querySubmitted, setQuerySubmitted] = useState (null)
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
      // setQuerySubmitted (value)
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
      setQuerySubmitted (queryProp)
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
      <div className='x__search'>
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
        <SearchResults query={querySubmitted}/>
      </div>}
    </SearchS>
  }
)
