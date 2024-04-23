import {
  pipe, compose, composeRight,
  assoc, nil, die, defaultTo, id,
} from 'stick-js/es'

import { makeReducer, } from 'alleycat-js/es/redux'

import { setNumPerPageIdx, setPage, } from './actions'
import { reducer, } from '../../../common'

const initialStates = {}

const mkInitialState = () => ({
  page: 0,
  numPerPageIdx: 0,
  numsPerPage: [10, 50, 100],
})

const checkKey = (k1, k2) => (reduce) => k1 === k2 ? reduce : id

// --- @future ugly to check the key on each operation (we could probably make the state object more
// structured)
const mkReducerTable = (theKey) => makeReducer (
  setNumPerPageIdx, ({ key, n, }) => checkKey (theKey, key) (assoc ('numPerPageIdx', n)),
  setPage, ({ key, page, }) => checkKey (theKey, key) (assoc ('page', page)),
)

// --- @future this is a bit ugly (we may want to design it differently next time we want a reusable
// container). Basically the selector tries to select the initial state before it's been created, so
// getInitialState creates it, if necessary, and stores it in the map.
export const getInitialState = (key) => initialStates [key] | defaultTo (() => {
  const state = mkInitialState ()
  initialStates [key] = state
  return state
})

export default (key) => {
  if (nil (key)) die ('need key')
  const initialState = getInitialState (key)
  return reducer (key, initialState, mkReducerTable (key))
}
