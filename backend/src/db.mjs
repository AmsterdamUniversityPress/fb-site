import {
  pipe, compose, composeRight,
  tryCatch, id, die,
  whenPredicate, noop, multiply, lets,
  map, ok,
} from 'stick-js/es'

import { dirname, } from 'path'

import { yellow, } from 'alleycat-js/es/io';
import { info, decorateRejection, } from 'alleycat-js/es/general';
import { isLeft, fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { S, SB, getApi, } from 'alleycat-js/es/bsqlite3'

import { config, } from './config.mjs'
import { errorX, mkdirIfNeeded, } from './io.mjs';
import { doEither, } from './util.mjs';

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
    userPrivilege string not null,
    unique (userId, userPrivilege)
  )`)
]

// @todo remove
const daysInFuture = (n) => Number (new Date ()) + n*24*3600*1000
const daysInPast = daysInFuture << multiply (-1)

const initTestData = (encryptPassword) => lets (
  () => encryptPassword,
  (encrypt) => doEither (
    () => userAdd ('sjdfjsdfjsdfj@alleycat.cc', 'x', 'x', encrypt ('xxx'), daysInPast (1)),
    () => userAdd ('expired@alleycat.cc', 'ed', 'van gisteren', encrypt ('xxx'), daysInPast (1)),
    () => userAdd ('allen@alleycat.cc', 'allen', 'fishmaster', encrypt ('appel'), daysInFuture (2)),
    () => userAdd ('arie@alleycat.cc', 'arie', 'bombarie', encrypt ('peer'), daysInFuture (1)),
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

export const userAdd = (email, firstName, lastName, password) => sqliteApi.run (
  SB (`insert into user (email, firstName, lastName, password) values (?, ?, ?, ?)`,
  [email, firstName, lastName, password],
))

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

export const loggedInAdd = (email) => doEither (
  () => userIdGet (email),
  (userId) => sqliteApi.run (
    SB (`insert into loggedIn (userId) values (?)`, userId),
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
