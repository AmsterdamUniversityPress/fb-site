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
import { logWith, trim, iwarn, } from 'alleycat-js/es/general'
import { allV, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'
import { media, mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import reducer from './reducer'
import saga from './saga'
import {
  selectFiltersWithCounts,
  selectSelectedFilters,
  selectQuery as selectSearchQuery,
  selectResults as selectResultsSearch,
  selectNumResults as selectNumResultsSearch,
} from './selectors'
import { autocompleteQueryUpdated, } from '../App/actions/main'
import { selectResultsAutocomplete, } from '../App/store/domain/selectors'

import { Input, } from '../../components/shared/Input'
import InputWithAutocomplete from '../../components/shared/InputWithAutocomplete'
import { PaginationAndExplanation, } from '../../components/shared'
import mkPagination from '../../containers/shared/Pagination'

import { component, container, container2, useWhy, requestIsLoading, requestResults, } from '../../common'
import {
  effects, isNotEmptyString, mapX, ifEven,
  whenIsNotEmptyList,
  mapRemapTuples,
  mapUpdate,
  setRemap,
  setToggle,
  flatten,
  mapFlatRemapTuples,
} from '../../util-general'

import config from '../../config'
const configTop = configure.init (config)
const paginationKey = configTop.get ('app.keys.Pagination.search')
const imageEyeWall = configTop.get ('images.fonds')
const targetValue = path (['target', 'value'])

const Pagination = mkPagination (paginationKey)

const SearchS = styled.div`
  > * {
    vertical-align: top;
  }
  > .x__sidebar {
    position: relative;
    display: inline-block;
    width: 400px;
  }
  > .x__main {
    display: inline-block;
    width: calc(100% - 450px);
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

const ResultsS = styled.div`
  background: white;
  min-width: 100px;
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

const FilterBubble = styled.span`
  border: 1px solid #666666;
  border-radius: 50px;
  background-color: #f8f9fa;
  transition: background-color .1s;
  padding: 1px 15px 1px 15px;
  font-size: 14px;
  color: black;
  white-space: nowrap;
`

const FilterBubbleTextS = styled (FilterBubble)`
  padding: 10px 15px 10px 15px;
  &:hover {
    background-color: #dae0e5;
    cursor: pointer;
  }
  > .x__close {
    position: relative;
    top: 2px;
    margin-left: 5px;
    font-weight: bold;
    font-size: 20px;
  }
`

const FilterBubbleText = ({ children, }) => <FilterBubbleTextS>
  {children}
  <span className='x__close'>
    ×
  </span>
</FilterBubbleTextS>

const FilterS = styled.div`
  text-align: left;
  > .x__title {
    font-weight: bold;
  }
  > .x__row {
    white-space: nowrap;
    display: flex;
    justify-content: space-between;
    > * {
      vertical-align: middle;
    }
    > .x__clickable {
      flex: 1 0 0px;
      cursor: pointer;
      display: inline-block;
      width: calc(100% - 40px);
      overflow-x: hidden;
      text-overflow: ellipsis;
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
      flex: 0 0 50px;
    }
  }
`

const Filter = ({ name, counts, selecteds=new Set, onChange: onChangeProp, }) => {
  // --- we don't check event -- we simply toggle in the parent
  const onChange = useCallback (
    (value, _event) => onChangeProp (name, value),
    [onChangeProp, name],
  )
  return <FilterS>
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
          <FilterBubble>
            {count}
          </FilterBubble>
        </span>
      </div>
    )}
  </FilterS>
}

const FiltersS = styled.div`
`

const Filters = container2 (
  ['Filters'],
  () => {
    const navigate = useNavigate ()
    const filtersReq = useSelector (selectFiltersWithCounts)
    const searchQuery = useSelector (selectSearchQuery)
    // --- 'category' => 'onderwijs', 'category' => 'religie', 'trefwoorden' => ...,
    const selectedFilters = useSelector (selectSelectedFilters)

    const commit = useCallback ((selected) => {
      const tuples = flatten (1) (selected | mapRemapTuples (
        (filterName, values) => values | setRemap (
          (value) => [filterName, value],
        )
      ))
      const params = new URLSearchParams (tuples)
      navigate ([encodeURIComponent (searchQuery), params.toString ()] | sprintfN (
        '/search/%s?%s',
      ))
    }, [searchQuery, navigate])

    const onChange = useCallback (
      (filterName, value) => commit (
        selectedFilters | mapUpdate (
          filterName, setToggle (value),
        ),
      ),
      [selectedFilters],
    )

    return <FiltersS>
      {filtersReq | requestResults ({
        spinnerProps: { color: 'black', size: 20, delayMs: 400, },
          onError: noop,
          onResults: (filters) => <>
            {
              filters | map (
                ([filterName, countsMap]) => <Filter
                  key={filterName}
                  name={filterName}
                  counts={countsMap}
                  // selecteds={selected.get (filterName)}
                  selecteds={selectedFilters.get (filterName)}
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
  min-width: 400px;
  max-width: 400px;
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
      {
        /*
        <span className={zoekenCls}><span className='x__text'>zoeken</span></span>
          */
      }
    </SearchBarS>
  },
)

const ActiveFiltersS = styled.div`
  text-align: left;
  margin-left: 30px;
  margin-right: 30px;
  > .x__title {
    font-size: 24px;
  }
  > .x__filters {
    // display: flex;
    // align-items: space-between;
    // flex-wrap: wrap;
    line-height: 50px;
    > .x__item {
      // flex: 1 0 0px;
      margin-right: 10px;
      display: inline-block;
    }
  }
`

const ActiveFilters = container2 (
  ['ActiveFilters'],
  () => {
    const navigate = useNavigate ()
    const selectedFilters = useSelector (selectSelectedFilters)
    console.log ('filters', selectedFilters)

    const searchQuery = useSelector (selectSearchQuery)
    // --- @todo heavily repeated from <Filters>
    const commit = useCallback ((selected) => {
      const tuples = flatten (1) (selected | mapRemapTuples (
        (filterName, values) => values | setRemap (
          (value) => [filterName, value],
        )
      ))
      const params = new URLSearchParams (tuples)
      navigate ([encodeURIComponent (searchQuery), params.toString ()] | sprintfN (
        '/search/%s?%s',
      ))
    }, [navigate, searchQuery])

    const onClick = useCallback (
      (filterName, value) => commit (
        selectedFilters | mapUpdate (
          filterName, setToggle (value),
        ),
      ),
      [selectedFilters],
    )

    return <ActiveFiltersS>
      <div className='x__title'>
        Active filters
      </div>
      <div className='x__filters'>
        {selectedFilters | mapFlatRemapTuples (
          (filterName, values) => values | setRemap (
          (value) => <span className='x__item' onClick={() => onClick (filterName, value)}><FilterBubbleText>
            {filterName}: {value}
          </FilterBubbleText></span>
          ),
        )}
      </div>
    </ActiveFiltersS>
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
          <div className='x__pagination'>
            <PaginationAndExplanation query={query} showExplanation={true} numItems={numResults ?? 0} Pagination={Pagination}/>
            <div className={clss ('x__separator', isLoading ? 'x--waiting' : 'x--not-waiting')}/>
          </div>
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
        </>
      })}
    </ResultsS>
  }
)

export const Search = container (
  ['Search',
    {},
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
    } = props
    // --- `queryProp` is the query that has been accepted, set in the URL, and passed down to us
    // again by React Router. If this is the first time this component sees this value for `queryProp` then it hasn't been searched on yet (it's our job to do it using the effect below).
    // If it's nil it means there hasn't been a search yet; e.g., we're looking at Main.
    const [querySubmitted, setQuerySubmitted] = useState (null)
    useEffect (() => { setQuerySubmitted (queryProp) }, [queryProp])
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
        <div className='x__filters'>
          <ActiveFilters/>
        </div>
        {showResults && <div className='x__search-results-wrapper'>
          <SearchResults query={querySubmitted}/>
        </div>}
      </div>
    </SearchS>
  }
)
