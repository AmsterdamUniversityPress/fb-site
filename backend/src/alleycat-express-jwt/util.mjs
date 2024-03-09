import {
  pipe, compose, composeRight,
  dot1, ifPredicate, isString, id,
  recurry, ifNil, die,
} from 'stick-js/es'

export const noopP = async () => {}
export const flatMap = dot1 ('flatMap')

// --- note that you can not serialize an Error as JSON (for some reason?)
const ifString = isString | ifPredicate
export const toJSON = ifString (id, JSON.stringify)

export const okOrDie = recurry (2) (
  (dieWith) => ifNil (() => die (dieWith), id)
)
