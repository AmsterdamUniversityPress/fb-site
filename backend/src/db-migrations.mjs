import {
  pipe, compose, composeRight,
  id, nil, tap, ifTrue, join,
  lets, rangeToBy,
  map, sprintfN, sprintf1,
  rangeTo,
  multiply,
} from 'stick-js/es'

import { Left, Right, cata, flatMap, } from 'alleycat-js/es/bilby'
import { S, SB, } from 'alleycat-js/es/bsqlite3'
import { logWith, } from 'alleycat-js/es/general'
import { green, info, red, yellow, } from 'alleycat-js/es/io'

import { doEither, flatten, ifString, isNonNegativeInt, mapLookupEitherOnWith, pluckOkZ, reverse, traverseListEither, } from './util.mjs'

import migrationsList from './migrations.mjs'
import { doEitherWithTransaction, checkHasExactlyOneRowFail, tableExists, } from './util-db.mjs'

const migrations = new Map (migrationsList)

const getMigrationSql = (dir, num, allowDestructive) => pluckOkZ (
  ['forwards', 'backwards'],
  ({ [dir]: migr, }) => migr | pluckOkZ (
    ['destructive', 'sql'],
    ({ destructive, sql, }) => {
      if ((destructive !== false) && !allowDestructive) return Left (
        'Not allowing destructive migration (step ' + String (num) + ') -- use ALLOW_DESTRUCTIVE_MIGRATIONS to allow this',
      )
      if (nil (sql)) return Left (
        'missing sql for migration step ' + String (num),
      )
      return Right (sql)
    },
  )
)

const getMigrations = (allowDestructive, from, to) => {
  const d = from - to
  const [by, dir, nums, transformMigrations] =
    // --- note that the second endpoint is non-inclusive
    // --- e.g. for 3 -> 6 we need the 'forwards' values for [3, 4, 5].
    d < 0 ? [1, 'forwards', (from + 1) | rangeTo (to + 1), id] :
    // --- e.g. for 6 -> 3 we need the 'backwards' values for [6, 5, 4], and we need to reverse the order within each step.
    d > 0 ? [-1, 'backwards', from | rangeToBy (-1, to), reverse] : [0]
  if (by === 0) return Left ('getMigrations (): unexpected, versions are equal')
  return nums | traverseListEither (
    (num) => lets (
      () => num | mapLookupEitherOnWith ('No migration for ' + String (num), migrations),
      (migsEither) => migsEither | flatMap (transformMigrations >> traverseListEither (
        getMigrationSql (dir, num, allowDestructive) >> map (ifString (S, id)),
      )),
    ),
  )
  | map (flatten (1))
  | tap (map ((xs) => {
    const pref = '    ٭ '
    info ('running migrations:\n' + join ('\n') (xs | map (
      // --- @todo does bsqlite have fold?
      cata ({
        S: (x) => pref + x,
        SB: (x, bindings) => [pref, x, bindings | map (String) >> join (', ')] | sprintfN ('%s%s [%s]'),
      }),
    )))
  }))
}


const doMigrations = (sqliteApi, allowDestructive, versionCur, versionTgt) => doEither (
  () => getMigrations (allowDestructive, versionCur, versionTgt),
  (sqls) => doEitherWithTransaction (
    sqliteApi,
    ... sqls | map (
      (sql) => () => sqliteApi.run (sql),
    ),
    () => sqliteApi.run (SB ('update version set version=?', [versionTgt])),
  )
)

export const runMigrations = (sqliteApi, versionTgt, allowDestructive=false) => doEither (
  () => tableExists (sqliteApi, 'version'),
  (exists) => exists | ifTrue (
    () => checkHasExactlyOneRowFail (sqliteApi, 'version'),
    () => doEither (
      () => sqliteApi.run (S (`create table version (version integer)`)),
      () => sqliteApi.run (S (`insert into version (version) values ((0))`)),
    ),
  ),
  () => sqliteApi.getPluck (S (`select version from version`)),
  (versionCur) => {
    return (isNonNegativeInt (versionTgt) && isNonNegativeInt (versionCur)) ?
      Right (versionCur) : Left ('bad version in db and/or config')
  },
  (versionCur) => {
    const d = versionCur - versionTgt
    if (d < 0) {
      info ([
        d | multiply (-1) | String | green,
        versionCur | String | yellow,
        versionTgt | String | yellow,
      ] | sprintfN (
        'going to run %s migrations (version %s -> version %s)',
      ))
    }
    else if (d > 0) {
      info ([
        d | String | green,
        versionCur | String | red,
        versionTgt | String | red,
      ] | sprintfN (
        'going to run %s reverse migrations (version %s -> version %s)',
      ))
    }
    else {
      info (versionCur | green | String | sprintf1 (
        'DB schema (version %s) is up-to-date',
      ))
      return Right (null)
    }
    return doMigrations (sqliteApi, allowDestructive, versionCur, versionTgt)
  },
)
