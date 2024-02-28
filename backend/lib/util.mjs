import { pipe, compose, composeRight } from 'stick-js/es';
import path from 'path';
import { fileURLToPath } from 'url';

// --- usage: `__dirname (import.meta.url)`
export var __dirname = composeRight(fileURLToPath, path.dirname);
var mkdir = function mkdir(dir) {
  return sysSpawn('mkdir', ['-p', dir], {
    sync: true,
    die: true
  });
};
export var mkdirIfNeeded = function mkdirIfNeeded(dir) {
  return fs.existsSync(dir) || mkdir(dir);
};