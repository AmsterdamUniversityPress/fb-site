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
} from './actions'
import {
  filtersFetch,
  filtersFetchCompleted,
} from '../App/actions/main'
import { rcompleteToResults, foldWhenRequestResults, reducer, } from '../../common'

export const initialState = {
  // --- a URLSearchParams object
  filterSearchParams: null,
  filters: RequestInit,
  querySearch: null,
  // --- request results
  resultsSearch: RequestInit,
  bucketsSearch: RequestInit,
  // --- simple value, not RequestInit etc. (though it could just as well have been)
  // (note, not the length of `resultsSearch`, which may contain several snippets per document).
  numResultsSearch: null,
}

const reducerTable = makeReducer (
  filtersFetch, () => assoc (
    'filters', RequestLoading (Nothing),
  ),
  filtersFetchCompleted, (rcomplete) => assoc (
    'filters', rcomplete | rcompleteToResults,
  ),
  searchFetch, ({ query, filterSearchParams, }) => composeManyRight (
    assoc ('filterSearchParams', filterSearchParams),
    assoc ('querySearch', query),
    assoc ('bucketsSearch', RequestLoading (Nothing)),
    assoc ('resultsSearch', RequestLoading (Nothing)),
    assoc ('numResultsSearch', null),
  ),
  searchFetchCompleted, (rcomplete) => {
    const results = rcomplete | rcompleteToResults
    return composeManyRight (
      assoc ('bucketsSearch', results | map (
        path (['metadata', 'buckets']),
      )),
      assoc ('resultsSearch', results | map (prop ('results'))),
      assoc ('numResultsSearch', results | foldWhenRequestResults (
        path (['metadata', 'numHits']),
      )),
    )
  },
)

export default reducer ('Search', initialState, reducerTable)
