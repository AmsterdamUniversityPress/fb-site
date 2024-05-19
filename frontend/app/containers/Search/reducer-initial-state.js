import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'

export const initialState = {
  // --- a URLSearchParams object
  filterSearchParams: null,

  // --- the queries that have actually been executed
  queryAutocomplete: null,
  querySearch: null,

  // --- request results
  results: RequestInit,
  resultsAutocomplete: RequestInit,
  buckets: RequestInit,
  // --- simple value, not RequestInit etc. (though it could just as well have been)
  // (note, not the length of `results`, which may contain several snippets per document).
  numResults: null,
  lastUpdatedFilterName: null,
}
