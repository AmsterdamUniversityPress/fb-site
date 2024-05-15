import {
  pipe, compose, composeRight,
  assoc, map, prop, tap, path,
  update, merge,
  id,
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
    const new_bucket_data = results | foldWhenRequestResults (
      (res) => ({
        naam_organisatie: res.metadata.buckets.naam_organisatie,
        regios: res.metadata.buckets.regios,
        trefwoorden: res.metadata.buckets.trefwoorden,
      })
    )
    return composeManyRight (
      update ('buckets', cata ({
        RequestInit: () => RequestResults (new_bucket_data),
        RequestLoading: () => void 8,
        RequestError: () => void 8,
        RequestResults: (old_data) => RequestResults (old_data | merge (new_bucket_data)),
      })),
      assoc ('results', results | map (prop ('results'))),
      assoc ('numResults', results | foldWhenRequestResults (
        path (['metadata', 'numHits']),
      )),
    )
  },
  searchBucketsFetchCompleted, (rcomplete) => {
    const new_categories = rcomplete | rcompleteToResults | foldWhenRequestResults (
      (res) => res.metadata.buckets.categories,
    )
    return update ('buckets', cata ({
      RequestInit: () => RequestResults (new_categories),
      RequestLoading: () => void 8,
      RequestError: () => void 8,
      RequestResults: (old_data) => RequestResults (old_data | assoc ('categories', new_categories))
    }))
  },
)

export default reducer ('Search', initialState, reducerTable)
