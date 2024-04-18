import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { cata, Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { trim, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import { autocompleteFetch, autocompleteFetchCompleted, searchFetch, searchFetchCompleted, } from './actions'
import { rcompleteToResults, reducer, } from '../../common'

export const initialState = {
  resultsAutocomplete: RequestInit,
  resultsSearch: RequestInit,
}

const reducerTable = makeReducer (
  autocompleteFetchCompleted, (rcomplete) => assoc ('resultsAutocomplete', rcompleteToResults (rcomplete)),
  searchFetch, () => assoc (
    'resultsSearch', RequestLoading (Nothing),
  ),
  searchFetchCompleted, (rcomplete) => assoc (
    'resultsSearch', rcomplete | rcompleteToResults,
  ),
)

export default reducer ('Search', initialState, reducerTable)
