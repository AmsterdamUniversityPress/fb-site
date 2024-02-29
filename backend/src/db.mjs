import {
  pipe, compose, composeRight,
  tryCatch, id, die,
  whenPredicate, noop, multiply, lets,
  map, whenOk,
} from 'stick-js/es'


Error.stackTraceLimit = 1000
import { dirname, } from 'path'

import { yellow, } from 'alleycat-js/es/io';
import { info, decorateRejection, } from 'alleycat-js/es/general';
import { isLeft, fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { S, SB, getApi, } from 'alleycat-js/es/bsqlite3'

import { config, } from './config.mjs'
import { errorX, mkdirIfNeeded, } from './io.mjs';
import { base64decodeAsBuffer, base64encode, doEither, } from './util.mjs';

const configTop = config | configure.init

const { dbPath, } = tryCatch (
  id,
  decorateRejection ("Couldn't load config: ") >> errorX,
  () => configTop.gets ('dbPath')
)
const foldWhenLeft = p => whenPredicate (isLeft) (fold (p, noop))

const createTables = [
  S (`drop table if exists user`),
  S (`create table user (
    id integer primary key autoincrement,
    email text unique not null,
    firstName text,
    lastName text,
    password text not null,
    expires integer not null
  )`)]

const daysInFuture = (n) => Number (new Date ()) + n*24*3600*1000
const daysInPast = daysInFuture << multiply (-1)

const initTestData = (encryptPassword) => lets (
  () => encryptPassword >> base64encode,
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

export const userAdd = (email, firstName, lastName, password, expires) => sqliteApi.run (
  SB (`insert into user (email, firstName, lastName, password,
  expires) values (?, ?, ?, ?, ?)`, [email, firstName, lastName,
      password, expires])
)

export const userGet = (email) => sqliteApi.get (
  SB ('select email, firstName, lastName, password, expires from user where email = ?', [email]),
) | map (whenOk (
  ({ password, ...rest }) => ({ password: base64decodeAsBuffer (password), ...rest }),
))

// --- `password` is a Buffer
export const userPasswordUpdate = (user_id, hashed_password) => sqliteApi.run (
  SB (`update user set password = ? where id = ?`, [hashed_password | base64encode, user_id],
))
