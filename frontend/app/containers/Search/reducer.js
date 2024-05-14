import {
  pipe, compose, composeRight,
  assoc, map, prop, tap, path,
} from 'stick-js/es'

import { cata, Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, logWith, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  searchFetch,
  searchFetchCompleted,
  updateFilterToggle,
} from './actions'

import { initialState, } from './reducer-initial-state'
import { selectSelectedFilters, } from './selectors'
import { rcompleteToResults, foldWhenRequestResults, reducer, } from '../../common'

const reducerTable = makeReducer (
  searchFetch, ({ query, filterSearchParams, }) => composeManyRight (
    assoc ('filterSearchParams', filterSearchParams),
    assoc ('querySearch', query),
    // --- it seems a bit nicer not to reset this on a new search so that the sidebar doesn't flicker
    // assoc ('buckets', RequestLoading (Nothing)),
    assoc ('results', RequestLoading (Nothing)),
    assoc ('numResults', null),
  ),
  searchFetchCompleted, (rcomplete) => {
    const results = rcomplete | rcompleteToResults
    return composeManyRight (
      assoc ('buckets', results | map (
        path (['metadata', 'buckets']),
      )),
      assoc ('results', results | map (prop ('results'))),
      assoc ('numResults', results | foldWhenRequestResults (
        path (['metadata', 'numHits']),
      )),
    )
  },
)

export default reducer ('Search', initialState, reducerTable)
