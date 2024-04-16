import {
  pipe, compose, composeRight,
  tryCatch, id, die,
  whenPredicate, noop, lets,
  map, ok, compact, tap,
} from 'stick-js/es'

import { dirname, } from 'node:path'

import { Right, isLeft, fold, } from 'alleycat-js/es/bilby'
import { S, SB, getApi, } from 'alleycat-js/es/bsqlite3'
import configure from 'alleycat-js/es/configure'
import { decorateRejection, logWith, } from 'alleycat-js/es/general'
import { info, yellow, } from 'alleycat-js/es/io'

import { config as configUser, } from './config.mjs'
import { errorX, mkdirIfNeeded, } from './io.mjs'
import { doEither, } from './util.mjs'
import { runMigrations, } from './db-migrations.mjs'

const configTop = configUser | configure.init

const { dbPath, } = tryCatch (
  id,
  decorateRejection ("Couldn't load user config: ") >> errorX,
  () => configTop.gets ('dbPath')
)

// --- @todo put somewhere else / reuse ?
const foldWhenLeft = p => whenPredicate (isLeft) (fold (p, noop))

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

export const initUsers = (encryptPassword, users) => doEither (
  () => Right (null),
  ... users | map (({ email, password, firstName, lastName, hasAdminUser, }) => {
    return () => userAddOrReplace (
      email, firstName, lastName,
      compact (['user', hasAdminUser && 'admin-user']),
      encryptPassword (password),
    )
  }))
  | foldWhenLeft (
    decorateRejection ("Couldn't initialise users: ") >> die,
  )

const _userAdd = ({ allowExists, vals: { email, firstName, lastName, privileges, password, }}) => lets (
  () => allowExists ? ' on conflict do nothing' : '',
  (upsertClause) => doEither (
    () => sqliteApi.run (SB (
      `insert into user (email, firstName, lastName, password) values (?, ?, ?, ?)` + upsertClause,
      [email, firstName, lastName, password] ,
    )),
    ({ lastInsertRowid: userId, }) => sqliteApi.runs (privileges | map (
      (priv) => SB (`insert into userPrivilege (userId, privilege) values (?, ?)` + upsertClause,
      [userId, priv]
    ))),
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

export const userRemove = (email) => doEitherWithTransaction (
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

export const userGet = (email) => sqliteApi.get (
  SB ('select email, firstName, lastName, password from user where email = ?', email),
)

// export const userInfoGet = (email) => doEither (
  // () => privilegeGet (email),
// (privilege) => userGet (email) | map ((info) => [privilege, info])
  // ([privilege, info]) => [privilege, info]
// )

const userIdGet = (email) => sqliteApi.getPluck (
  SB ('select id from user where email = ?', email),
)

export const userPasswordUpdate = (email, hashed_password) => doEither (
  () => userIdGet (email),
  (userId) => sqliteApi.run (
    SB (`update user set password = ? where id = ?`, [hashed_password, userId],)
  ),
)

export const loggedInAdd = (email) => doEither (
  () => userIdGet (email),
  (userId) => sqliteApi.run (
    SB (`insert or ignore into loggedIn (userId) values (?)`, userId),
  )
)

const loggedInGetId = (email) => sqliteApi.getPluck (
  SB ('select l.id from user u outer left join loggedIn l on u.id = l.userId where u.email = ?', email)
)

export const loggedInGet = loggedInGetId >> map (ok)

export const loggedInRemove = (email) => doEither (
  () => loggedInGetId (email),
  (userId) => sqliteApi.run (
    SB (`delete from loggedIn where id = ?`, userId),
  ),
)

export const usersGet = () => sqliteApi.all (S (`
  select u.email, u.firstName, u.lastName, group_concat(up.privilege) as privileges,
  (case when password is null then 0 else 1 end) as isActive
  from user u left join userPrivilege up
  on u.id = up.userId
  group by email
`))

export const privilegesGet = (email) => sqliteApi.allPluck (SB (
  `select privilege from user u join userPrivilege up
  on u.id = up.userId
  where u.email = ?`, email
))
