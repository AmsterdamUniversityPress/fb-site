import {
  pipe, compose, composeRight,
  dot1, ifPredicate, isString, id,
  recurry, ifNil, die, ok,
} from 'stick-js/es'

export const noopP = async () => {}
export const flatMap = dot1 ('flatMap')

// --- note that you can not serialize an Error as JSON (for some reason?)
const ifString = isString | ifPredicate
export const toJSON = ifString (id, JSON.stringify)

const isError = (e) => ok (e) && ok (e.stack) && ok (e.message)
const ifError = isError | ifPredicate

export const errorToJSON = toJSON << ifError (
  (e) => e.message,
  id,
)

export const okOrDie = recurry (2) (
  (dieWith) => ifNil (() => die (dieWith), id)
)
