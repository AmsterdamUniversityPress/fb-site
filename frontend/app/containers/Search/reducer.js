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
  querySearch: null,
  // --- request results
  results: RequestInit,
  buckets: RequestInit,
  // --- simple value, not RequestInit etc. (though it could just as well have been)
  // (note, not the length of `results`, which may contain several snippets per document).
  numResults: null,
}

const reducerTable = makeReducer (
  searchFetch, ({ query, filterSearchParams, }) => composeManyRight (
    assoc ('filterSearchParams', filterSearchParams),
    assoc ('querySearch', query),
    assoc ('buckets', RequestLoading (Nothing)),
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
