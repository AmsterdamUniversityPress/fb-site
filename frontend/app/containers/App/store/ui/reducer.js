import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import {} from '../../actions/main'

import { reducer, } from '../../../../common'

export const initialState = {
}

const reducerTable = makeReducer (
)

export default reducer ('ui', initialState, reducerTable)
