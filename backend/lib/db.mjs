import { pipe, compose, composeRight, tryCatch, id, die, whenPredicate, noop } from 'stick-js/es';
import { dirname } from 'path';
import { yellow } from 'alleycat-js/es/io';
import { info, decorateRejection } from 'alleycat-js/es/general';
import { isLeft, fold } from 'alleycat-js/es/bilby';
import configure from 'alleycat-js/es/configure';
import { S, SB, getApi } from 'alleycat-js/es/bsqlite3';
import { errorX, mkdirIfNeeded } from './io.mjs';
import { config } from './config.mjs';
var configTop = pipe(config, configure.init);
var _tryCatch = tryCatch(id, composeRight(decorateRejection("Couldn't load config: "), errorX), function () {
    return configTop.gets('dbPath');
  }),
  dbPath = _tryCatch.dbPath;
var foldWhenLeft = function foldWhenLeft(p) {
  return whenPredicate(isLeft)(fold(p, noop));
};
var createTables = [S("drop table if exists user"), S("create table user (\n    id integer primary key autoincrement,\n    email text unique not null,\n    first_name text,\n    last_name text,\n    hashed_password text not null,\n    expires text not null\n  )")];
var initTestData = [S("insert into user (email, first_name, last_name, hashed_password, expires) values\n    ( 'arie@alleycat.cc', 'arie', 'bombarie', 'hash', '01-01-9999'),\n    ( 'allen@alleycat.cc', 'allen', 'fishmaster', 'hash', '01-01-0000')\n  ")];
var sqliteApi;
var initialiseSchema = function initialiseSchema() {
  return sqliteApi.runs(createTables);
};
var initialiseTestData = function initialiseTestData() {
  return sqliteApi.runs(initTestData);
};
export var init = function init() {
  info('opening db file at', pipe(dbPath, yellow));
  mkdirIfNeeded(dirname(dbPath));
  sqliteApi = getApi(dbPath, {});
  pipe(initialiseSchema(), foldWhenLeft(composeRight(decorateRejection("Couldn't initialise schema: "), die)));
  pipe(initialiseTestData(), foldWhenLeft(composeRight(decorateRejection("Couldn't initialise test data: "), die)));
};