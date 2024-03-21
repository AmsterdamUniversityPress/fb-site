import {
  pipe, compose, composeRight,
  assoc,
} from 'stick-js/es'

import { makeReducer, } from 'alleycat-js/es/redux'

import { setNumPerPageIdx, setPage, } from './actions'
import { reducer, } from '../../../common'

export const initialState = {
  page: 0,
  numPerPageIdx: 0,
  numsPerPage: [10, 50, 100],
}

const reducerTable = makeReducer (
  setNumPerPageIdx, (n) => assoc ('numPerPageIdx', n),
  setPage, (page) => assoc ('page', page),
)

export default reducer ('Pagination', initialState, reducerTable)
