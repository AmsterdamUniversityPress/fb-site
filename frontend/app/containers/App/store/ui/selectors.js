import {
  pipe, compose, composeRight,
  add, whenOk, prop, defaultToV,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'
import { ifEquals, } from 'alleycat-js/es/predicate'

import { initialState, } from './reducer'

const selectSlice = (store, props) => store | prop ('ui') | defaultToV (initialState)
