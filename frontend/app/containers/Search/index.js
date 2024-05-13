import {
  pipe, compose, composeRight,
  path, noop, ok, join, map, not, recurry, ifTrue,
  sprintfN, nil, tap, concatM, concat, take,
  ifOk, dot, id, always, defaultToV, reduce,
  prop, whenOk, split, lets,
  whenFalse, whenTrue,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import { useNavigate, } from 'react-router-dom'

import { useDispatch, useSelector, } from 'react-redux'
import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { RequestInit, } from 'alleycat-js/es/fetch'
import { logWith, trim, iwarn, } from 'alleycat-js/es/general'
import { allV, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'
import { media, mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import { searchFetch, searchReset, } from './actions'
import reducer from './reducer'
import saga from './saga'
import {
  selectFiltersWithCounts,
  selectFilterNames,
  selectFilterValues,
  // selectFilterSearchParams,
  selectSelectedFilters,
  // selectBuckets,
  selectQuery as selectSearchQuery,
  selectResults as selectResultsSearch,
  selectNumResults as selectNumResultsSearch,
} from './selectors'
import { autocompleteQueryUpdated, } from '../App/actions/main'
import { selectResultsAutocomplete, } from '../App/store/domain/selectors'

import { Input, } from '../../components/shared/Input'
import InputWithAutocomplete from '../../components/shared/InputWithAutocomplete'
import { BigButton, DropDown, PaginationAndExplanation, } from '../../components/shared'
import mkPagination from '../../containers/shared/Pagination'

import { component, container, container2, useWhy, requestIsLoading, requestResults, foldWhenRequestResults, } from '../../common'
import {
  effects, isNotEmptyString, whenIsNotEmptyString, mapX, reduceX, ifEven,
  whenIsNotEmptyList,
  mapForEach, mapGet, mapUpdateM,
  mapRemapTuples,
  mapSetM,
  mapUpdate, setAdd, setRemove,
  setToggle,
} from '../../util-general'
import { mkURLSearchParams, } from '../../util-web'

import config from '../../config'
const configTop = configure.init (config)
const paginationKey = configTop.get ('app.keys.Pagination.search')
const imageEyeWall = configTop.get ('images.fonds')
const targetValue = path (['target', 'value'])

const Pagination = mkPagination (paginationKey)

const SearchS = styled.div`
  display: flex;
  // > * {
    // vertical-align: middle;
  // }
  > .x__sidebar {
    position: relative;
    flex: 0 0 300px;
    left: 0;
    transition: left 0.1s;
    // &.x--hide { left: -300px; }
  }
  > .x__main {
    flex: 1 0 0px;
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
    }
  }
`

const ResultsInnerS = styled.div`
  background: white;
  min-width: 100px;
  margin-top: 30px;
`

const ResultsS = styled.div`
  > .x__pagination {
    > .x__separator {
      --width: 60%;
      height: 1px;
      background: #000;
      width: var(--width);
      margin-left: calc((100% - var(--width))/2);
      &.x--waiting {
        width: 0%;
      }
      &.x--not-waiting {
        transition: width 200ms;
      }
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
  .highlight {
    background: yellow;
  }
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
      text-transform: uppercase;
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
    // --- @todo do something with type?
    > .x__type {
      display: none;
      margin-right: 4px;
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
    }
  }

`

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
      <div className='x__name'>
        {name}
      </div>
      <div className='x__categories'>
        {categories}
        {/* [categories
            | map (dot ('toUpperCase')) | join (', ')
            | truncate (55)] */}
      </div>
    </div>
    <div className='x__right'>
      <div className='x__objective'>
      {/* [objective | split (' ') | truncate (30) | join (' ')] | sprintfN ("%s") */}
      {[objective]}
      </div>
      <div className='x__type'>{[type] | sprintfN ("Type: %s")}</div>
      {targetGroup | whenIsNotEmptyList (
        () => <div className='x__targetGroup'>Doelgroep:&nbsp;
          {targetGroup}
        </div>,
      )}
      {workingRegion | whenIsNotEmptyList (
        () => <div className='x__workingRegion'>Werkregio:&nbsp;
          {workingRegion}
        </div>,
      )}
    </div>
  </ResultS>
}

// --- receives a list of lists, where the outer list must contain exactly one element in the case
// of string fields (doelstelling etc.) and several elements in the case of an array field
// (categories).

const highlightJoin = recurry (2) (
  (joiner=(idx) => idx === 0 ? '' : ', ') => (xss) => xss | mapX (
    (xs, idx) => [joiner (idx), ... xs | mapX (
      (x, idx2) => idx2 | ifEven (
        () => <span key={idx2}>{x}</span>,
        () => <span key={idx2} className='highlight'>{x}</span>,
      ),
    )],
  ),
)

const highlightList = highlightJoin (void 8)
const highlightString = highlightJoin ((idx) => {
  if (idx > 0) iwarn ('highlightString (): expected single element')
  return ''
})

// @todo find a nice place for this
// probably possible to use remapMapTuples from kattenluik
const mapToList = (m) => {
  const ret = []
  m | mapForEach ((options, name) => options
    | mapForEach ((val, option) => val | whenTrue (
      () => ret.push ([name, option]))))
  return ret
}

const OptionS = styled.div`
  .x__select {
    display: inline-block;
    padding-right: 20px;
  }
  .x__data {
    display: inline-block;
    &:hover {
      background: #ffcbcb6b;
    }
  }
`

const Option = ({
  data,
  onSelect,
  selected: selectedProp,
}) => {
  const [selected, setSelected] = useState (selectedProp)
  const onClick = useCallback (() => {
    setSelected (not)
    onSelect ()
  }, [onSelect, setSelected])
  return <OptionS>
    <div className='x__select'>
      {selected ? 'yes' : 'no'}
    </div>
    <div
      className='x__data'
      onClick={onClick}
    >
      {data}
    </div>
  </OptionS>
}

const Filter2S = styled.div`
  text-align: left;
  > .x__title {
    font-weight: bold;
  }
  > .x__row {
    white-space: nowrap;
    > * {
      vertical-align: middle;
    }
    > .x__clickable {
      cursor: pointer;
      > input {
        width: 20px;
        height: 20px;
        margin-right: 10px;
      }
      > .x__value {
        margin-right: 4px;
      }
    }
    > .x__count {
      float: right;
      border: 1px solid #666666;
      border-radius: 50px;
      background: #dddddd;
      padding: 1px 7px 1px 7px;
      font-size: 14px;
      color: black;
      font-weight: bold;
    }
  }
`

const Filter2 = ({ name, counts, selecteds=new Set, onChange: onChangeProp, }) => {
  // --- we don't check event -- we simply toggle in the parent
  const onChange = useCallback (
    (value, _event) => onChangeProp (name, value),
    [onChangeProp, name],
  )
  return <Filter2S>
    <div className='x__title'>
      {name}
    </div>
    {counts | mapRemapTuples (
      (value, count) => <div key={value} className='x__row'>
        {/* --- @todo useCallback (2x) */}
        <div className='x__clickable' onClick={(event) => onChange (value, event)}>
          <input type='checkbox'
            checked={selecteds.has (value)}
            // --- just here to keep react from complaining: we actually handle the change using
            // onClick on the div
            onChange={noop}
          />
          <span className='x__value'>
            {value}
          </span>
        </div>
        <span className='x__count'>
          {count}
        </span>
      </div>
    )}
  </Filter2S>
}

const FilterS = styled.div`
  .x__dropdown-wrapper {
  }
  .x__filter {
    background: white;
    display: inline-block;
    font-size: 20px;
    width: 100%;
    height: 35px;
    .x__filter-name {
      padding-left: 10px;
      display: inline-block;
      width: 200px;
    }
    .x__filter-open-char, .x__filter-close-char {
      display: inline-block;
      font-size: 35px;
      padding-left: 20px;
      position: absolute;
    }
    .x__filter-open-char {
      margin-top: -1px;
    }
    .x__filter-close-char {
      margin-top: -16px;
    }
  }
`

const Filter = ({ name, options, optionMap, onChange, }) => {
  const [open, setOpen] = useState (false)
  const onClick = useCallbackConst (
    () => setOpen (not),
  )
  const onSelect = useCallback (
    (option) => () => {
      onChange (option)
  }, [onChange])

  // --- @todo this means something is probably wrong higher up
  if (nil (optionMap)) return

  return <FilterS>
    <div className='x__filter' onClick={onClick}>
      {open | ifTrue (
        () => <><div className='x__filter-name'> {name}</div><div className='x__filter-open-char'>⌃</div></>,
        () => <><div className='x__filter-name'> {name}</div> <div className='x__filter-close-char'>⌄</div></>
      )}
    </div>
    <div className='x__dropdown-wrapper'>
      <DropDown open={open} contentsStyle={{ position: 'relative', maxWidth: '200px', textWrap: 'wrap' }}>
        {options | mapX ((option, idx) => {
          // @todo make nice option_short
          const option_short = (option | take (15)) + ' ... '
          return <Option
            key={option}
            data={option_short}
            selected={optionMap | mapGet (option)}
            onSelect={onSelect (option)}
          />
        }
        )}
      </DropDown>
    </div>
  </FilterS>
}

const FiltersS = styled.div`
  > .x__button {
    padding: 20px;
  }
`

const Filters = container2 (
  ['Filters'],
  (props) => {
    const filtersReq = useSelector (selectFiltersWithCounts)
    const filterNamesReq = useSelector (selectFilterNames)
    const selectedFilters = useSelector (selectSelectedFilters)
    console.log ('selectFilters', selectedFilters)

    // const onChange = useCallback (
      // (name) => (option) => {
        // setFilterMap (
          // filterMap | mapUpdateM (
            // name,
            // mapUpdateM (option, not),
        // ))
      // }, [filterMap, setFilterMap],
    // )

    // --- @mock
    // const onClickSubmit = useCallback (() => {
      // const filterMapTemp = filterMap | mapToList
      // const params = new URLSearchParams (filterMapTemp)
      // navigate ([encodeURIComponent (searchQuery), params.toString ()] | sprintfN (
        // '/search/%s?%s',
      // ))
    // }, [navigate, filterMap, searchQuery])

    const onChange = useCallback (
      (filterName, value) => setSelected (
        mapUpdate (filterName, setToggle (value)),
      ),
    )
    // --- 'category' => 'onderwijs', 'category' => 'religie', 'trefwoorden' => ...,
    const [selected, setSelected] = useState (new Map)
    useEffect (() => {
      setSelected (selectedFilters)
    }, [selectedFilters])
    return <FiltersS>
      {filtersReq | requestResults ({
        spinnerProps: { color: 'black', size: 20, delayMs: 400, },
          onError: noop,
          onResults: (filters) => <>
            {
              filters | map (
                ([filterName, countsMap]) => <Filter2
                  key={filterName}
                  name={filterName}
                  counts={countsMap}
                  selecteds={selected.get (filterName)}
                  onChange={onChange}
                />
              )
            }
            {/* filterMap | map (
              ({ name, options, }) => <Filter
                key={name}
                name={name}
                options={options}
                optionMap={filterMapRequest | mapGet (name)}
                onChange={onChange (name)}
              />
            ) */}
          </>,
      })}
    </FiltersS>
  }
)

const SidebarS = styled.div`
  height: 100%;
  width: 100%;
  padding: 20px;
  background: #FFFFFF66;
  backdrop-filter: blur(5px);
`

const Sidebar = () => <SidebarS>
  <Filters/>
</SidebarS>

const SearchBarS = styled.div`
`

export const SearchBar = container2 (
  ['SearchBar'],
  ({
    onSelect: onSelectProp=noop,
    query: queryProp=null,
  }) => {
    const navigate = useNavigate ()
    const dispatch = useDispatch ()
    const resultsRequest = useSelector (selectResultsAutocomplete)

    // --- this is the query as it's being entered, but hasn't been accepted yet.
    const [query, setQuery] = useState ('')
    useEffect (() => {
      if (ok (queryProp)) setQuery (queryProp)
    }, [queryProp])

    // --- @todo start at null, move useMemo down, easier to follow
    const [suggestions, setSuggestions] = useState (null)

    // --- @todo change name
    const onChangeValue = useCallbackConst (effects ([
      setQuery,
      dispatch << autocompleteQueryUpdated,
      // () => setSearchParamsString (null),
    ]))
    const onChange = useCallback (targetValue >> trim >> onChangeValue, [onChangeValue])
    const onClear = useCallback (() => {
      onChangeValue ('')
      setSuggestions ([])
    }, [onChangeValue])
    const startSearch = useCallback ((value) => {
      navigate ([encodeURIComponent (value), document.location.search] | sprintfN (
        '/search/%s%s',
      ))
    }, [navigate])
    // --- after choosing autocomplete value or typing query and pressing enter
    const onSelect = useCallback ((value) => {
      setQuery (value)
      onSelectProp (value !== query)
      startSearch (value)
      // --- @todo we've changed the order, is that ok?
      // if (value !== query) setIsNewQuery (true)
    }, [onSelectProp, query, startSearch])
    const canSearch = useMemo (() => query | isNotEmptyString, [query])
    // --- the autocomplete results
    // @todo better name
    const results = useMemo (
      () => resultsRequest | requestResults ({
        onLoading: noop,
        onError: noop,
      }),
      [resultsRequest],
    )
    const zoekenCls = clss ('x__zoeken', canSearch || 'x--disabled')
    useEffect (() => { setSuggestions (results) }, [results])

    return <SearchBarS>
      <InputWithAutocomplete
        Input={Input}
        inputWrapperProps={{
          withIcon: ['search', 'left'],
          showClearIcon: true,
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
        initValue={query}
        closeOnSelected={true}
        suggestions={suggestions}
        onChange={onChange}
        onClear={onClear}
        onSelect={onSelect}
      />
      <span className={zoekenCls}><span className='x__text'>zoeken</span></span>
    </SearchBarS>
  },
)

const SearchResults = container2 (
  ['SearchResults'],
  (props) => {
    const { query, } = props
    const searchResults = useSelector (selectResultsSearch)
    const numResults = useSelector (selectNumResultsSearch)
    const imgSrc = imageEyeWall
    const isLoading = searchResults | requestIsLoading
    return <ResultsS>
      <div className='x__pagination'>
        <PaginationAndExplanation query={query} showExplanation={true} numItems={numResults ?? 0} Pagination={Pagination}/>
        <div className={clss ('x__separator', isLoading ? 'x--waiting' : 'x--not-waiting')}/>
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
                ({ uuid, name, type, workingRegion, objective, categories, targetGroup, }) => <Result
                  key={uuid}
                  imgSrc={imgSrc}
                  categories={highlightList (categories)}
                  name={highlightString (name)}
                  objective={highlightString (objective)}
                  targetGroup={highlightString (targetGroup)}
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
      searchFetchDispatch: searchFetch,
      searchResetDispatch: searchReset,
    },
    {
      resultsSearch: selectResultsSearch,
      searchQuery: selectSearchQuery,
    },
  ],
  (props) => {
    const {
      query: queryProp=null,
      searchParamsString: searchParamsStringProp='',
      showResults: showResultsProp,
      resultsSearch,
      // --- `searchQuery` is the query that has actually been executed (contrast with `queryProp`)
      searchQuery,
      searchFetchDispatch, searchResetDispatch,
    } = props
    const filterSearchParams = searchParamsStringProp | mkURLSearchParams (
      // --- @todo add more
      ['categories', 'trefwoorden'],
    )
    // --- `queryProp` is the query that has been accepted, set in the URL, and passed down to us
    // again by React Router. If this is the first time this component sees this value for `queryProp` then it hasn't been searched on yet (it's our job to do it using the effect below).
    // If it's nil it means there hasn't been a search yet; e.g., we're looking at Main.
    // --- keep track of this so that the effect doesn't continually fire
    const [searchParamsString, setSearchParamsString] = useState (null)
    useEffect (() => { setSearchParamsString (searchParamsStringProp) }, [searchParamsStringProp])
    const [querySubmitted, setQuerySubmitted] = useState (null)
    // --- we want to distinguish the case of starting a new search, with a new query, and searching
    // on a different page or page size with the existing query. In the first case we want the text
    // about the number of results to disappear and get redrawn, and in the second case, we want the
    // whole pagination component to be as smooth as possible (just the numbers / texts change).
    // This will cause a slight flicker in the first case, but it's confusing if the old text
    // suddenly gets replaced by new text when the new results come in.
    const [isNewQuery, setIsNewQuery] = useState (false)
    const onSelect = useCallbackConst ((isNew) => setIsNewQuery (isNew))

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
      if (queryProp === searchQuery && searchParamsString === searchParamsStringProp) return
      searchResetDispatch ()
      searchFetchDispatch (queryProp, filterSearchParams)
    }, [queryProp, searchQuery, searchParamsString, searchParamsStringProp, searchResetDispatch, searchFetchDispatch, filterSearchParams])

    useEffect (() => {
      setIsNewQuery (false)
    }, [resultsSearch])

    useWhy ('Search', props)
    useReduxReducer ({ createReducer, reducer, key: 'Search', })
    useSaga ({ saga, key: 'Search', })

    return <SearchS>
      <div className='x__sidebar'>
        <Sidebar/>
      </div>
      <div className='x__main'>
        <div className='x__search'>
          <SearchBar query={queryProp} onSelect={onSelect}/>
        </div>
        {showResults && <div className='x__search-results-wrapper'>
          <SearchResults query={querySubmitted}/>
        </div>}
      </div>
    </SearchS>
  }
)
