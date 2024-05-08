import {
  pipe, compose, composeRight,
  assoc, always, id, update, not,
} from 'stick-js/es'

import { cata, Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestError, RequestLoading, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  filtersFetch,
  filtersFetchCompleted,
  fondsenFetch,
  fondsenFetchCompleted,
  halt,
} from '../../actions/main'

import { rcompleteToResults, reducer, } from '../../../../common'

export const initialState = {
  // --- `error=true` means the reducer is totally corrupted and the app should halt.
  error: false,
  filters: RequestInit,
  fondsen: RequestInit,
  // --- gets set each time we request a chunk of fonds data -- note that we don't set it to Nothing
  // at the beginning of each request, because we don't want the pagination component (which selects
  // on this) to flicker.
  numFondsen: Nothing,
}

const reducerTable = makeReducer (
  halt, () => assoc ('error', true),
  filtersFetch, () => assoc (
    'filters', RequestLoading (Nothing),
  ),
  filtersFetchCompleted, (rcomplete) => assoc (
    'filters', rcomplete | rcompleteToResults
  ),
  fondsenFetch, ({ resetResults, ... _ }) => not (resetResults) ? id : assoc (
    'fondsen', RequestLoading (Nothing),
  ),
  fondsenFetchCompleted, (rcomplete) => composeManyRight (
    assoc ('fondsen', rcomplete | rcompleteToResults),
    update ('numFondsen', rcomplete | cata ({
      RequestCompleteError: id,
      RequestCompleteSuccess: (results) => always (Just (results.metadata.totalAvailable)),
    })),
  ),
)

export default reducer ('domain', initialState, reducerTable)
