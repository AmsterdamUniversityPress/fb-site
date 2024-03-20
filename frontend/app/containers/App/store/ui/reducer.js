import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { cata, } from 'alleycat-js/es/bilby'

import { logWith, } from 'alleycat-js/es/general'
import { RequestInit, RequestError, RequestLoading, RequestResults, } from 'alleycat-js/es/fetch'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  passwordUpdate,
  passwordUpdateDone,
  passwordUpdateCompleted,
} from '../../actions/main'

import { reducer, } from '../../../../common'

export const initialState = {
  passwordUpdated: RequestInit,
}

const reducerTable = makeReducer (
  // @todo we might do something with the RequestLoading state at some point
  // (i.e. show a spinner or something)
  passwordUpdate, (_) => assoc (
    'passwordUpdated', RequestLoading (Nothing),
  ),
  passwordUpdateCompleted, (rcomplete) => assoc (
    'passwordUpdated', rcomplete | cata ({
      RequestCompleteError: (e) => RequestError (e),
      RequestCompleteSuccess: (r) => RequestResults (r),
    }),
  ),
  passwordUpdateDone, (_) => assoc (
    'passwordUpdated', RequestInit,
  )
)

export default reducer ('ui', initialState, reducerTable)
