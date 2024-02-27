import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestLoading, RequestResults, } from 'alleycat-js/es/fetch'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  loginLogoutCompleted,
} from '../../actions/main'

import { reducer, } from '../../../../common'

export const initialState = {
  // --- we expect /hello to be called on app mount, so loading is fine as an initial state.
  user: RequestLoading (Nothing),
}

const reducerTable = makeReducer (
  // --- user null means error or not logged in -- we collapse both to mean 'not logged in' since
  // we've already shown the oops bubble
  loginLogoutCompleted, ({ user, }) => assoc ('user', RequestResults (user)),
)

export default reducer ('app', initialState, reducerTable)
