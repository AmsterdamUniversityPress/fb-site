import { pipe, compose, composeRight, tap, join, die, bindProp, invoke, condS, otherwise, eq, lte, guard, ifOk, nil, whenPredicate, sprintf1 } from 'stick-js/es';
import fs from 'fs';
import fishLib from 'fish-lib';
var log = fishLib.log,
  green = fishLib.green,
  magenta = fishLib.magenta,
  brightRed = fishLib.brightRed,
  red = fishLib.red,
  blue = fishLib.blue,
  yellow = fishLib.yellow,
  cyan = fishLib.cyan,
  underline = fishLib.underline,
  ierror = fishLib.ierror,
  iwarn = fishLib.iwarn,
  forceColors = fishLib.forceColors,
  disableColors = fishLib.disableColors,
  sysSpawn = fishLib.sysSpawn;
import { then, recover } from 'alleycat-js/es/async';
import { toString, decorateRejection } from 'alleycat-js/es/general';
export { log, ierror, iwarn, green, magenta, blue, cyan, red, yellow, brightRed, underline, sysSpawn };
fishLib.sysSet({
  die: true,
  verbose: true,
  sync: true
}).bulletSet({
  type: 'parallel-lines'
});
var whenLte = composeRight(lte, whenPredicate);
var level = 2;
var secretLevel = 0;
var setLevel = function setLevel(theLevel) {
  return level = theLevel;
};
var setSecretLevel = function setSecretLevel(theLevel) {
  return secretLevel = theLevel;
};
var speak = function speak(theLevel, f) {
  return function () {
    if (level >= theLevel) f.apply(void 0, arguments);
  };
};
var _debug = function _debug() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }
  return log.apply(void 0, [pipe([yellow('.'), blue('.'), yellow('.')], join(''))].concat(args));
};
export var setLevelError = function setLevelError() {
  return pipe(0, setLevel);
};
export var setLevelWarn = function setLevelWarn() {
  return pipe(1, setLevel);
};
export var setLevelInfo = function setLevelInfo() {
  return pipe(2, setLevel);
};
export var setLevelDebug = function setLevelDebug() {
  return pipe(3, setLevel);
};
export var setLevelTrace = function setLevelTrace() {
  return pipe(4, setLevel);
};
export var setSecretLevelOff = function setSecretLevelOff() {
  return pipe(0, setSecretLevel);
};
export var setSecretLevelOn = function setSecretLevelOn() {
  return pipe(1, setSecretLevel);
};
export var setSecretLevelMore = function setSecretLevelMore() {
  return pipe(2, setSecretLevel);
};

// --- note that the error functions are all considered fatal and cause the
// program to halt.

export var errorPlain = speak(0, fishLib.error);
export var warnPlain = speak(1, fishLib.warn);
export var infoPlain = speak(2, fishLib.info);
export var debugPlain = speak(3, _debug);
export var writeStdout = pipe(process.stdout, bindProp('write'));
var speakIt = function speakIt(f, dateColor) {
  return function () {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    return f.apply(void 0, [pipe(new Date().toISOString(), dateColor)].concat(args));
  };
};
var speakWith = function speakWith(f) {
  return function (header) {
    return function () {
      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }
      return f.apply(void 0, [header].concat(args));
    };
  };
};
export var info = speakIt(infoPlain, underline);
export var infoWith = speakWith(info);
export var debug = speakIt(debugPlain, blue);
export var debugWith = speakWith(debug);
export var warn = speakIt(warnPlain, brightRed);
export var error = speakIt(errorPlain, red);
var _infoSecret = function _infoSecret(theLevel) {
  for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
    args[_key4 - 1] = arguments[_key4];
  }
  return pipe(theLevel, whenLte(secretLevel)(function () {
    return info.apply(void 0, args);
  }));
};
export var infoSecret = function infoSecret() {
  for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
    args[_key5] = arguments[_key5];
  }
  return _infoSecret.apply(void 0, [1, brightRed('[secrecy 1]')].concat(args));
};
export var infoSecretMore = function infoSecretMore() {
  for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
    args[_key6] = arguments[_key6];
  }
  return _infoSecret.apply(void 0, [2, underline(red('[secrecy 2]'))].concat(args));
};

// --- no date, just for internal use.
export var logWith = speakWith(log);

/* Takes an exception, prints it as a (string) error message, and exits. In debug mode it also
 * prints the full exception with stack trace.
 */

// :: Error -> IO ()
export var errorX = composeRight(composeRight(tap(debugWith('Full exception:')), toString), error);

/* Like `errorX`, but call warn/info instead of exiting with error.
 */

// :: Error -> IO ()
export var warnX = composeRight(composeRight(tap(debugWith('Full exception:')), toString), warn);
export var infoX = composeRight(composeRight(tap(debugWith('Full exception:')), toString), info);
export var mkdir = function mkdir(dir) {
  return sysSpawn('mkdir', ['-p', dir], {
    sync: true,
    die: true
  });
};
export var mkdirIfNeeded = function mkdirIfNeeded(dir) {
  return fs.existsSync(dir) || mkdir(dir);
};
export var init = function init(forceColorsOpt, disableColorsOpt, secretOpt) {
  if (forceColorsOpt) forceColors();else if (disableColorsOpt) disableColors();
  invoke(pipe(secretOpt, condS([pipe(pipe(0, eq), guard(function () {
    return setSecretLevelOff;
  })), pipe(pipe(1, eq), guard(function () {
    return setSecretLevelOn;
  })), pipe(pipe(2, eq), guard(function () {
    return setSecretLevelMore;
  })), pipe(otherwise, guard(function () {
    return error('invalid value for -s');
  }))])));
};