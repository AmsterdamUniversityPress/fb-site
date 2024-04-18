import {
  pipe, compose, composeRight,
  assoc, nil, die,
} from 'stick-js/es'

import { makeReducer, } from 'alleycat-js/es/redux'

import { setNumPerPageIdx, setPage, } from './actions'
import { reducer, } from '../../../common'

export const initialState = {
  page: 0,
  numPerPageIdx: 1,
  numsPerPage: [10, 50, 100],
}

const reducerTable = makeReducer (
  setNumPerPageIdx, (n) => assoc ('numPerPageIdx', n),
  setPage, (page) => assoc ('page', page),
)

export default (key) => {
  if (nil (key)) die ('need key')
  return reducer (key, initialState, reducerTable)
}
