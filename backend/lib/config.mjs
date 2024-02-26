import { pipe, compose, composeRight } from 'stick-js';
import { realpathSync as realpath } from 'fs';
import { join as pathJoin } from 'path';
import { __dirname } from './util.mjs';
var rootDir = realpath(pathJoin(__dirname(import.meta.url), '..'));
var dbDir = pathJoin(rootDir, 'db');
var dbPath = pathJoin(dbDir, 'main.db');
export var config = {
  dbPath: dbPath,
  serverPort: 4444
};