import {
  pipe, compose, composeRight,
  tryCatch, id, die,
  whenPredicate, noop,
} from 'stick-js/es'

import { dirname, } from 'path'

import { yellow, } from 'alleycat-js/es/io';
import { info, decorateRejection, } from 'alleycat-js/es/general';
import { isLeft, fold, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { S, SB, getApi, } from 'alleycat-js/es/bsqlite3'

import { errorX, mkdirIfNeeded, } from './io.mjs';
import { config, } from './config.mjs'

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
    first_name text,
    last_name text,
    hashed_password text not null,
    expires text not null
  )`)]

const initTestData = [
  S (`insert into user (email, first_name, last_name, hashed_password, expires) values
    ( 'arie@alleycat.cc', 'arie', 'bombarie', 'hash', '01-01-9999'),
    ( 'allen@alleycat.cc', 'allen', 'fishmaster', 'hash', '01-01-0000')
  `)]

let sqliteApi

const initialiseSchema = () => sqliteApi.runs (createTables)

const initialiseTestData = () => sqliteApi.runs (initTestData)

export const init = () => {
  info ('opening db file at', dbPath | yellow)
  mkdirIfNeeded (dirname (dbPath))
  sqliteApi = getApi (dbPath, {})
  initialiseSchema () | foldWhenLeft (
    decorateRejection ("Couldn't initialise schema: ") >> die,
  )
  initialiseTestData () | foldWhenLeft (
    decorateRejection ("Couldn't initialise test data: ") >> die,
  )
}
