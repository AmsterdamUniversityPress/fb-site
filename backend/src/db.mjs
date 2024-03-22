import {
  pipe, compose, composeRight,
  tryCatch, id, die,
  whenPredicate, noop, multiply, lets,
  map, ok,
} from 'stick-js/es'

import { dirname, } from 'path'

import { yellow, } from 'alleycat-js/es/io'
import { info, decorateRejection, } from 'alleycat-js/es/general'
import { isLeft, fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { S, SB, getApi, } from 'alleycat-js/es/bsqlite3'

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

const createTables = [
  S (`drop table if exists user`),
  S (`drop table if exists loggedIn`),
  S (`drop table if exists userPrivilege`),
  S (`create table user (
    id integer primary key autoincrement,
    email text unique not null,
    firstName text,
    lastName text,
    password text not null
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

const initTestData = (encryptPassword) => lets (
  () => encryptPassword,
  (encrypt) => doEither (
    () => userAdd ('allen@alleycat.cc', 'allen', 'fishmaster', ['user'], encrypt ('appel')),
    () => userAdd ('arie@alleycat.cc', 'arie', 'bombarie', ['user', 'user-admin'], encrypt ('peer')),
    // () => privilegeAdd ('sjdfjsdfjsdfj@alleycat.cc', 'user'),
    // () => privilegeAdd ('expired@alleycat.cc', 'user'),
    // () => privilegeAdd ('arie@alleycat.cc', 'admin-user'),
    // () => privilegeAdd ('allen@alleycat.cc', 'user'),
  ),
)

let sqliteApi

const initialiseSchema = () => sqliteApi.runs (createTables)

const initialiseTestData = (encryptPassword) => initTestData (encryptPassword)

export const init = (encryptPassword) => {
  info ('opening db file at', dbPath | yellow)
  mkdirIfNeeded (dirname (dbPath))
  sqliteApi = getApi (dbPath, {})
  initialiseSchema () | foldWhenLeft (
    decorateRejection ("Couldn't initialise schema: ") >> die,
  )
  initialiseTestData (encryptPassword) | foldWhenLeft (
    decorateRejection ("Couldn't initialise test data: ") >> die,
  )
}

export const userAdd = (email, firstName, lastName, privileges, password) => doEither (
  () => sqliteApi.run (SB (
    `insert into user (email, firstName, lastName, password) values (?, ?, ?, ?)`,
    [email, firstName, lastName, password]),
  ),
  ({ lastInsertRowid: userId, }) => sqliteApi.runs (privileges | map (
    (priv) => SB (`insert into userPrivilege (userId, privilege) values (?, ?)`, [userId, priv]),
  )),
)

export const userGet = (email) => sqliteApi.get (
  SB ('select email, firstName, lastName, password from user where email = ?', email),
)

// export const userInfoGet = (email) => lets (
  // () => privilegeGet (email),
  // () => userGet (email),
  // (privilege, info) => (privilege, info)
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
