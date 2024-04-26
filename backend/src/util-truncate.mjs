import {
  pipe, compose, composeRight,
  lets, invoke, id, recurry, dot1, concat, dot2,
} from 'stick-js/es'

import { length, } from 'alleycat-js/es/general'
import { ifFalseV, } from 'alleycat-js/es/predicate'

export const slice = dot2 ('slice')
export const slice1 = dot1 ('slice')

export const truncate = recurry (2) (
  (n) => (s) => lets (
    () => length (s) > n,
    (doIt) => doIt | ifFalseV (id, slice (0, n) >> concat ('…')),
    (_, f) => f (s),
  ),
)

// --- returns [s, amountGrown]
export const truncateBGrowRight2 = invoke (() => {
  const growRightEdge = (s, n) => {
    let m = n
    const re = /\S/
    const l = s.length
    while (m < l && s [m].match (re))
      m += 1
    return m
  }
  return recurry (2) (
    (n) => (s) => {
      const m = growRightEdge (s, n)
      return lets (
        () => length (s) > m,
        (doIt) => doIt | ifFalseV (id, slice (0, m) >> concat ('…')),
        (_, f) => [f (s), m - n],
      )
    },
  )
})

export const truncateBGrowRight = recurry (2) (
  (n) => (s) => truncateBGrowRight2 (n, s) [0],
)

export const truncateBGrowBoth = (s, leftIdx, length) => {
  const re = /\S/
  let m = leftIdx
  while (m > 0 && s [m].match (re))
    m -= 1
  const newLength = length + leftIdx - m
  return s.slice (m) | truncateBGrowRight (newLength)
}
