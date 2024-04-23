import {
  pipe, compose, composeRight,
  assoc, map, prop, tap, path,
} from 'stick-js/es'

import { cata, Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, logWith, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import { autocompleteFetch, autocompleteFetchCompleted, searchFetch, searchFetchCompleted, } from './actions'
import { rcompleteToResults, foldWhenRequestResults, reducer, } from '../../common'

export const initialState = {
  resultsAutocomplete: RequestInit,
  querySearch: null,
  // --- request results
  resultsSearch: RequestInit,
  // --- simple value
  // (note, not the length of `resultsSearch`, which may contain several snippets per document).
  numResultsSearch: null,
}

const reducerTable = makeReducer (
  autocompleteFetchCompleted, (rcomplete) => assoc ('resultsAutocomplete', rcompleteToResults (rcomplete)),
  searchFetch, (query) => composeManyRight (
    assoc ('resultsSearch', RequestLoading (Nothing)),
    assoc ('querySearch', query),
  ),
  searchFetchCompleted, (rcomplete) => composeManyRight (
    assoc ('resultsSearch', rcomplete | rcompleteToResults | map (prop ('results'))),
    assoc ('numResultsSearch', rcomplete | rcompleteToResults | foldWhenRequestResults (
      path (['metadata', 'numHits']),
    ))
  ),
)

export default reducer ('Search', initialState, reducerTable)
