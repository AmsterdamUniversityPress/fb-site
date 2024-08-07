import {
  pipe, compose, composeRight,
  tryCatch, id, die, noop, lets, isBoolean,
  map, ok, compact, tap,
} from 'stick-js/es'

import { dirname, } from 'node:path'

import { Left, Right, } from 'alleycat-js/es/bilby'
import { S, SB, getApi, } from 'alleycat-js/es/bsqlite3'
import configure from 'alleycat-js/es/configure'
import { decorateRejection, logWith, } from 'alleycat-js/es/general'
import { info, yellow, } from 'alleycat-js/es/io'

import { config as configUser, } from './config.mjs'
import { errorX, mkdirIfNeeded, } from './io.mjs'
import { doEither, epochMs, ifEqualsZero, foldWhenLeft, nullMap, } from './util.mjs'
import { doEitherWithTransaction, } from './util-db.mjs'
import { runMigrations, } from './db-migrations.mjs'

const configTop = configUser | configure.init

const { dbPath, } = tryCatch (
  id,
  decorateRejection ("Couldn't load user config: ") >> errorX,
  () => configTop.gets ('dbPath')
)

let sqliteApi

// --- initializes the schema if it's a new database, or if `forceInit` is `true`
// --- @throws
export const init = (version, allowDestructiveMigrations) => {
  info ('opening db file at', dbPath | yellow)
  mkdirIfNeeded (dirname (dbPath))
  sqliteApi = getApi (dbPath, {})
  runMigrations (sqliteApi, version, allowDestructiveMigrations) | foldWhenLeft (
    die << decorateRejection ("Couldn't run migrations: "),
  )
}

export const initUsers = (encryptPassword, users, initPasswords) => doEither (
  () => Right (null),
  ... users | map (({ email, password, firstName, lastName, hasAdminUser, }) => {
    return () => userAddOrReplace (
      email, firstName, lastName,
      compact (['user', hasAdminUser && 'admin-user']),
      initPasswords ? encryptPassword (password) : null,
    )
  }))
  | foldWhenLeft (
    decorateRejection ("Couldn't initialise users: ") >> die,
  )

// --- if the DB call returns null, we return `Right (false)`
export const getAllowAnalytical = (sessionId) => map (nullMap (Boolean), sqliteApi.getPluck (SB (
  `select allowAnalytical from session where sessionId = ?`,
  [sessionId],
)))

const _userAdd = ({ allowExists, vals: { email, firstName, lastName, privileges, password, }}) => lets (
  () => allowExists ? ' on conflict do nothing' : '',
  (upsertClause) => doEitherWithTransaction (sqliteApi,
    () => sqliteApi.run (SB (
      `insert into user (email, firstName, lastName, password) values (?, ?, ?, ?)` + upsertClause,
      [email, firstName, lastName, password],
    )),
    ({ changes, lastInsertRowid: userId, }) => changes | ifEqualsZero (
      // --- the user already exists, so nothing happened thanks to 'on conflict do nothing', so we
      // don't need to do the second step (adding privileges).
      () => Right (null),
      () => sqliteApi.runs (privileges | map (
        (priv) => SB (`
          insert into userPrivilege (userId, privilegeId) values
          (?, (select id from privilege p where p.privilege = ?))
          ` + upsertClause,
          [userId, priv],
        ),
      )),
    ),
  ),
)

export const userAdd = (email, firstName, lastName, privileges, password) => _userAdd ({
  allowExists: false,
  vals: { email, firstName, lastName, privileges, password },
})

export const userAddOrReplace = (email, firstName, lastName, privileges, password) => _userAdd ({
  allowExists: true,
  vals: { email, firstName, lastName, privileges, password },
})

export const userRemove = (email) => doEitherWithTransaction (sqliteApi,
  () => sqliteApi.getPluck (SB (
    `select id from user where email = ?`, email,
  )),
  (userId) => sqliteApi.run (SB (
    `delete from userPrivilege where userId = ?`, userId,
  )),
  () => sqliteApi.run (SB (
    `delete from user where email = ?`, email,
  )),
)

export const userAllowAnalyticalUpdate = (sessionId, allow) => doEither (
  // --- just an extra check because unwantd conversions to bool can be so annoying
  () => isBoolean (allow) ? Right (null) : Left ('userAllowAnalyticalUpdate: not a bool'),
  () => sqliteApi.run (SB (
    `update session set allowAnalytical = ? where sessionId = ?`,
    [Number (allow), sessionId],
  )),
)

export const userGet = (email) => sqliteApi.get (
  SB ('select email, firstName, lastName, password from user where email = ?', email),
)

const userIdGet = (email) => sqliteApi.getPluck (
  SB ('select id from user where email = ?', email),
)

export const userPasswordUpdate = (email, hashed_password) => doEither (
  () => userIdGet (email),
  (userId) => sqliteApi.run (
    SB (`update user set password = ? where id = ?`, [hashed_password, userId],)
  ),
)

export const sessionAdd = (email, sessionId) => doEither (
  () => userIdGet (email),
  (userId) => Right ([userId, epochMs ()]),
  ([userId, lastRefreshed]) => sqliteApi.run (
    SB (`insert into session (userId, sessionId, lastRefreshed) values (?, ?, ?) on conflict do nothing`, [userId, sessionId, lastRefreshed]),
  )
)

const sessionGetId = (email) => sqliteApi.getPluck (
  SB ('select s.id from user u outer left join session s on u.id = s.userId where u.email = ?', email)
)

export const sessionGet = sessionGetId >> map (ok)

const sessionGetUserIdFail = (email) => sqliteApi.getPluckFail (
  SB ('select u.id from user u left join session s on u.id = s.userId where u.email = ?', email)
)

export const sessionRefresh = (email, sessionId) => doEither (
  () => sessionGetUserIdFail (email),
  (userId) => sqliteApi.run (SB (
    `update session set lastRefreshed = ? where userId = ? and sessionId = ?`,
    [epochMs (), userId, sessionId],
  )),
)

export const sessionRemove = (email, sessionId) => doEither (
  () => sessionGetUserIdFail (email),
  (userId) => sqliteApi.run (
    SB (`delete from session where userId = ? and sessionId = ?`, [userId, sessionId]),
  ),
  ({ changes, }) => changes | ifEqualsZero (
    () => Left ('sessionRemove (): failed to remove any rows'),
    () => Right (null),
  ),
)

export const staleSessionsClear = (ms) => lets (
  () => epochMs () - ms,
  (cutoff) => sqliteApi.run (SB (
    `delete from session where lastRefreshed < ?`,
    cutoff,
  )),
)

export const usersGet = () => sqliteApi.all (S (`
  select u.email, u.firstName, u.lastName, group_concat(p.privilege) as privileges,
  (case when password is null then 0 else 1 end) as isActive
  from user u left join userPrivilege up
  on u.id = up.userId
  join privilege p
  on p.id = up.privilegeId
  group by email
`))

export const privilegesGet = (email) => sqliteApi.allPluck (SB (`
  select privilege from
  user u join userPrivilege up
  on u.id = up.userId
  join privilege p
  on p.id = up.privilegeId
  where u.email = ?
  `, email
))
