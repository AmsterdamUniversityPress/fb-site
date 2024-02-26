import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { makeReducer, } from 'alleycat-js/es/redux'

import {
  loginLogoutCompleted,
} from '../../actions/main'

import { reducer, } from '../../../../common'

export const initialState = {
  user: null,
}

const reducerTable = makeReducer (
  loginLogoutCompleted, ({ user, }) => assoc ('user', user),
)

export default reducer ('app', initialState, reducerTable)
