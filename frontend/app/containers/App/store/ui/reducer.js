import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { cata, Nothing, } from 'alleycat-js/es/bilby'

import { logWith, } from 'alleycat-js/es/general'
import { RequestInit, RequestError, RequestLoading, RequestResults, } from 'alleycat-js/es/fetch'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  passwordUpdate,
  passwordUpdateDone,
  passwordUpdateCompleted,
  resetPassword,
  resetPasswordDone,
  resetPasswordCompleted,
  updateNavigatingBack,
} from '../../actions/main'

import { reducer, } from '../../../../common'

export const initialState = {
  passwordUpdated: RequestInit,
  passwordReset: RequestInit,
  navigatingBack: false,
}

const reducerTable = makeReducer (
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
  ),
  resetPassword, (_) => assoc (
    'passwordReset', RequestLoading (Nothing),
  ),
  resetPasswordCompleted, ({ rcomplete, ... _}) => assoc (
    'passwordReset', rcomplete | cata ({
      RequestCompleteError: (e) => RequestError (e),
      RequestCompleteSuccess: (r) => RequestResults (r),
    }),
  ),
  resetPasswordDone, (_) => assoc (
    'passwordReset', RequestInit,
  ),
  updateNavigatingBack, (bool) => assoc (
    'navigatingBack', bool,
  )
)

export default reducer ('ui', initialState, reducerTable)
