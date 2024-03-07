import {
  pipe, compose, composeRight,
  dot1, ifPredicate, isString, id,
} from 'stick-js/es'

export const noopP = async () => {}
export const flatMap = dot1 ('flatMap')

const ifString = isString | ifPredicate
export const toJSON = ifString (id, JSON.stringify)
