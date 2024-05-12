import {
  pipe, compose, composeRight,
  assoc, map, prop, tap, path,
} from 'stick-js/es'

import { cata, Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, logWith, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  autocompleteFetch,
  autocompleteFetchCompleted,
  searchFetch,
  searchFetchCompleted,
} from './actions'
import {
  filtersFetch,
  filtersFetchCompleted,
} from '../App/actions/main'
import { rcompleteToResults, foldWhenRequestResults, reducer, } from '../../common'

export const initialState = {
  resultsAutocomplete: RequestInit,
  // --- a URLSearchParams object
  filterSearchParams: null,
  filters: RequestInit,
  querySearch: null,
  // --- request results
  resultsSearch: RequestInit,
  // @todo do we want to store this here, and do we not use RequestInit?
  searchBuckets: null,
  // --- simple value
  // (note, not the length of `resultsSearch`, which may contain several snippets per document).
  numResultsSearch: null,
}

const reducerTable = makeReducer (
  // --- @todo causes a flicker in the AC component, but we probably want something like this to
  // avoid a sort of weird effect where AC results lazily load after the suggestions have already
  // been displayed.
  // autocompleteFetch, () => assoc (
    // 'resultsAutocomplete', RequestLoading (Nothing),
  // ),
  autocompleteFetchCompleted, (rcomplete) => assoc (
    'resultsAutocomplete', rcompleteToResults (rcomplete),
  ),
  filtersFetch, () => assoc (
    'filters', RequestLoading (Nothing),
  ),
  filtersFetchCompleted, (rcomplete) => assoc (
    'filters', rcomplete | rcompleteToResults,
  ),
  searchFetch, ({ query, filterSearchParams, }) => composeManyRight (
    assoc ('resultsSearch', RequestLoading (Nothing)),
    assoc ('querySearch', query),
    assoc ('filterSearchParams', filterSearchParams),
  ),
  // @todo perhaps rewrite so that rcompleteToResults is not repeated so many times?
  searchFetchCompleted, (rcomplete) => composeManyRight (
    assoc ('resultsSearch', rcomplete | rcompleteToResults | map (prop ('results'))),
    assoc ('searchBuckets', rcomplete | rcompleteToResults | foldWhenRequestResults (
      path (['metadata', 'buckets']),
    )),
    assoc ('numResultsSearch', rcomplete | rcompleteToResults | foldWhenRequestResults (
      path (['metadata', 'numHits']),
    ))
  ),
)

export default reducer ('Search', initialState, reducerTable)
