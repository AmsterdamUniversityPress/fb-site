import {
  pipe, compose, composeRight,
  ok, die, tryCatch, sprintf1,
} from 'stick-js/es'

import { Left, Right, fold, } from 'alleycat-js/es/bilby'
import { S, } from 'alleycat-js/es/bsqlite3'

import { doEither, } from './util.mjs'

export const tableExists = (sqliteApi, tblName) => doEither (
  () => sqliteApi.pragma1Simple ('table_info', tblName),
  (x) => Right (ok (x)),
)

export const checkHasExactlyOneRowFail = (sqliteApi, tblName) => doEither (
  () => sqliteApi.getPluck (S (`select count(*) from ` + tblName)),
  (n) => (n === 1) ? Right (null) : Left (
    n | sprintf1 ('Table has %d rows, expected 1'),
  ),
)


// --- @todo find a good place for this
/* The bsqlite3 library lets us wrap an arbitrary function in db.transaction () and then run it.
 * It's also fine if those kinds of functions themselves open and close transactions (which means we
 * are free to use `runs`).
 * When the function exits, the transaction is committed, and if an error is thrown it rolls back.
 * This function lets us wrap a series of Either functions in a transaction by making sure that an
 * error is first caught by the `transaction` function, so that the rollback happens, then rethrown,
 * then caught by us and then wrapped in Left or Right.
 */

export const doEitherWithTransaction = (sqliteApi, ... fs) => tryCatch (
  (res) => Right (res),
  (err) => Left (err),
  () => sqliteApi.db.transaction (() => doEither (... fs) | fold (
    (e) => die ('Rolling back transaction due to error:', e),
    (r) => r,
  )) (),
)
