import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { cata, Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestInit, RequestLoading, RequestError, RequestResults, } from 'alleycat-js/es/fetch'
import { trim, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import { execute, executeCompleted, } from './actions'
import { rcompleteToResults, reducer, } from '../../common'

export const initialState = {
  results: RequestInit,
}

const reducerTable = makeReducer (
  // execute, () => assoc ('results', RequestLoading (Nothing)),
  executeCompleted, (rcomplete) => assoc ('results', rcomplete | cata ({
      RequestCompleteError: (e) => RequestError (e),
      RequestCompleteSuccess: (results) => RequestResults (results),
    }),
    )
)

export default reducer ('Search', initialState, reducerTable)
