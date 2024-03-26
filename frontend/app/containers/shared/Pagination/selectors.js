import {
  pipe, compose, composeRight,
  tap, lets, repeatF,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, mapX, } from '../../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'Pagination',
  initialState,
)

export const selectNumsPerPage = selectVal ('numsPerPage')
export const selectPage = selectVal ('page')

const selectNumPerPageIdx = selectVal ('numPerPageIdx')

export const selectNumsPerPageComponent = select (
  'numsPerPageComponent',
  [selectNumPerPageIdx, selectNumsPerPage],
  (idx, nums) => nums | mapX ((n, m) => ({
    n, idx: m, selected: m === idx,
  }))
)

export const selectNumPerPage = select (
  'numPerPage',
  [selectNumPerPageIdx, selectNumsPerPage],
  (idx, nums) => nums [idx],
)

const selectNumPages = select (
  'numPages',
  [selectNumPerPage],
  (npp) => (numItems) => lets (
    () => numItems / npp,
    (n) => Math.floor (n),
    (n, m) => n === m ? n : m + 1,
  ),
)

export const selectPageComponent = select (
  'pageComponent',
  [selectPage, selectNumPages],
  (cur, num) => (numItems) => num (numItems) | repeatF ((idx) => ({
    idx, n: idx + 1, selected: cur === idx,
  })),
)
