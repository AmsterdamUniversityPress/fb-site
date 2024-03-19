import {
  pipe, compose, composeRight,
  id, recurry, sprintf1,
} from 'stick-js/es'

import { sendStatus, } from 'alleycat-js/es/express'

import { eachAbort, } from './util.mjs'

export const getAndValidateQuery = recurry (5) (
  (spec) => (cont) => (req) => (res) => (next) => {
    const { query, } = req
    const paramVals = []
    const aborted = spec | eachAbort ((abort, [param, validate, transform=id]) => {
      // --- allow null and undefined (leave it to he validate function to deal with)
      const paramVal = query [param] | transform
      if (!validate (paramVal)) {
        res | sendStatus (499, { imsg: param | sprintf1 ('Invalid value for query param “%s”'), })
        abort ()
        return
      }
      paramVals.push (paramVal)
    })
    if (aborted) return
    return cont ({ req, res, next, }, ... paramVals)
  },
)
