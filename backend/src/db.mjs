import {
  pipe, compose, composeRight,
  tryCatch, id, die, not,
  whenPredicate, noop, lets,
  map, ok, compact,
} from 'stick-js/es'

import fs from 'node:fs'
import { dirname, } from 'node:path'

import { Left, Right, isLeft, fold, } from 'alleycat-js/es/bilby'
import { S, SB, getApi, } from 'alleycat-js/es/bsqlite3'
import configure from 'alleycat-js/es/configure'
import { info, decorateRejection, } from 'alleycat-js/es/general'
import { yellow, } from 'alleycat-js/es/io'

import { config, } from './config.mjs'
import { errorX, mkdirIfNeeded, } from './io.mjs'
import { doEither, } from './util.mjs'

const configTop = config | configure.init

const { dbPath, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets ('dbPath')
)
const foldWhenLeft = p => whenPredicate (isLeft) (fold (p, noop))

// --- @todo find a good place for this
/* The bsqlite3 library lets us wrap an arbitrary function in db.transaction () and then run it.
 * It's fine if those functions themselves open and close transactions (which means we are free to
 * use `runs`).
 * When the function exits the transaction is committed and if an error is thrown it rolls back.
 * This function lets us wrap a series of Either functions in a transaction by making sure that an
 * error is first seen by the `transaction` function, so that the roll back happens, and then
 * wrapped in Left (or Right for ok).
 */
const doEitherWithTransaction = (... fs) => tryCatch (
  (res) => Right (res),
  (err) => Left (err),
  () => sqliteApi.db.transaction (() => doEither (... fs) | fold (
    (e) => die ('Rolling back transaction due to error:', e),
    (r) => r,
  )) (),
)

const createTables = [
  S (`drop table if exists user`),
  S (`drop table if exists loggedIn`),
  S (`drop table if exists userPrivilege`),
  S (`create table user (
    id integer primary key autoincrement,
    email text unique not null,
    firstName text,
    lastName text,
    password text
  )`),
  S (`create table loggedIn (
    id integer primary key autoincrement,
    userId int not null,
    unique (userId)
  )`),
  S (`create table userPrivilege (
    id integer primary key autoincrement,
    userId int not null,
    privilege string not null,
    unique (userId, privilege)
  )`)
]

let sqliteApi

const initialiseSchema = () => sqliteApi.runs (createTables)

// --- initializes the schema if it's a new database, or if `forceInit` is `true`
export const init = (forceInit=false) => {
  info ('opening db file at', dbPath | yellow)
  mkdirIfNeeded (dirname (dbPath))
  const force = forceInit || not (fs.existsSync (dbPath))
  sqliteApi = getApi (dbPath, {})
  if (force) initialiseSchema () | foldWhenLeft (
    decorateRejection ("Couldn't initialise schema: ") >> die,
  )
}

export const initUsers = (encryptPassword, users) => doEither (
  () => Right (null),
  ... users | map (({ email, password, firstName, lastName, hasAdminUser, }) => {
    return () => userAdd (
      email, firstName, lastName,
      compact (['user', hasAdminUser && 'admin-user']),
      encryptPassword (password),
    )
  }),
)

const _userAdd = ({ replace, vals: { email, firstName, lastName, privileges, password, }}) => lets (
  () => replace ? 'insert or replace' : 'insert',
  (insert) => doEither (
    () => sqliteApi.run (SB (
      insert + ` into user (email, firstName, lastName, password) values (?, ?, ?, ?)`,
      [email, firstName, lastName, password]),
    ),
    ({ lastInsertRowid: userId, }) => sqliteApi.runs (privileges | map (
      (priv) => SB (insert + ` into userPrivilege (userId, privilege) values (?, ?)`, [userId, priv]),
    )),
  ),
)

export const userAdd = (email, firstName, lastName, privileges, password) => _userAdd ({
  replace: false,
  vals: { email, firstName, lastName, privileges, password },
})

export const userAddOrReplace = (email, firstName, lastName, privileges, password) => _userAdd ({
  replace: true,
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

// export const privilegeAdd = (email, privilege) => doEither (
  // () => userIdGet (email),
  // (userId) => sqliteApi.run (
    // SB (`insert into privilege (userId, privilege) values (?, ?)`, [ userId, privilege ]),
  // )
// )

// export const privilegeGet = (email) => sqliteApi.getPluck (
  // SB ('select p.privilege from user u outer left join privilege p on u.id = p.userId where u.email = ?', email)
// )

export const usersGet = () => sqliteApi.all (
  S ('select email, firstName, lastName from user'),
)

export const privilegesGet = (email) => sqliteApi.allPluck (SB (
  `select privilege from user u join userPrivilege up
  on u.id = up.userId
  where u.email = ?`, email
))
