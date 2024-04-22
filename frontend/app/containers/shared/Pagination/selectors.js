import {
  pipe, compose, composeRight,
  tap, lets, repeatF,
} from 'stick-js/es'

import { logWith, } from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, } from '../../../common'
import { mapX, } from '../../../util-general'

export const init = (key) => {
  const { select, selectTop, selectVal, } = initSelectors (key, initialState)
  const selectNumPerPageIdx = selectVal ('numPerPageIdx')
  const selectNumsPerPage = selectVal ('numsPerPage')
  const selectPage = selectVal ('page')

  const selectNumPerPage = select (
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

  const selectNumsPerPageComponent = select (
    'numsPerPageComponent',
    [selectNumPerPageIdx, selectNumsPerPage],
    (idx, nums) => nums | mapX ((n, m) => ({
      n, idx: m, selected: m === idx,
    }))
  )

  const selectPageComponent = select (
    'pageComponent',
    [selectPage, selectNumPages],
    (cur, num) => (numItems) => num (numItems) | repeatF ((idx) => ({
      idx, n: idx + 1, selected: cur === idx,
    })),
  )

  return {
    selectNumsPerPage,
    selectPage,
    selectNumsPerPageComponent,
    selectNumPerPage,
    selectPageComponent,
  }
}
