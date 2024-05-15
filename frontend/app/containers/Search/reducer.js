import {
  pipe, compose, composeRight,
  assoc, map, prop, tap, path,
  update, merge,
  id, ifNil,
} from 'stick-js/es'

import { cata, Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, logWith, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  searchFetch,
  searchFetchCompleted,
  searchBucketsFetchCompleted,
  updateFilterToggle,
} from './actions'

import { initialState, } from './reducer-initial-state'
import { selectSelectedFilters, } from './selectors'
import { rcompleteToResults, foldWhenRequestResults, mapRequestInitResults, reducer, } from '../../common'
import { remove, } from '../../util-general'

const reducerTable = makeReducer (
  searchFetch, ({ query, filterSearchParams, }) => composeManyRight (
    assoc ('filterSearchParams', filterSearchParams),
    assoc ('querySearch', query),
    // --- it seems a bit nicer not to reset this on a new search so that the sidebar doesn't flicker
    // assoc ('buckets', RequestLoading (Nothing)),
    assoc ('results', RequestLoading (Nothing)),
    assoc ('numResults', null),
  ),
  searchFetchCompleted, (rcomplete) => (state) => {
    const results = rcomplete | rcompleteToResults
    const { lastUpdatedFilterName, } = state
    const new_bucket_data = results | foldWhenRequestResults (
      (res) => res.metadata.buckets | remove (lastUpdatedFilterName),
    )
    return new_bucket_data | ifNil (
      () => state,
      () => state | composeManyRight (
        update ('buckets', mapRequestInitResults (
          new_bucket_data,
          merge (new_bucket_data),
        )),
        assoc ('results', results | map (prop ('results'))),
        assoc ('numResults', results | foldWhenRequestResults (
          path (['metadata', 'numHits']),
        )),
      ),
    )
  },
  searchBucketsFetchCompleted, (rcomplete) => (state) => {
    const { lastUpdatedFilterName, } = state
    const new_single_filter = rcomplete | rcompleteToResults | foldWhenRequestResults (
      (res) => res.metadata.buckets [lastUpdatedFilterName],
    )
    return new_single_filter | ifNil (
      () => state,
      () => state | update ('buckets', mapRequestInitResults (
        new_single_filter,
        assoc (lastUpdatedFilterName, new_single_filter),
      )),
    )
  },
  updateFilterToggle, ({ filterName, ... _ }) => assoc (
    'lastUpdatedFilterName', filterName,
  )
)

export default reducer ('Search', initialState, reducerTable)
