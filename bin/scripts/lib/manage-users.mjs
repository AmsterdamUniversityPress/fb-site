#!/usr/bin/env node
import _slicedToArray from "@babel/runtime/helpers/slicedToArray";
import _toArray from "@babel/runtime/helpers/toArray";
import _toConsumableArray from "@babel/runtime/helpers/toConsumableArray";
import { pipe, compose, composeRight, nil, ok, split, filter, map, each, join, sprintf1, tap, againstAny, againstAll, ne, die, sprintfN } from 'stick-js/es';
import { Buffer } from 'node:buffer';
import fsP from 'node:fs/promises';
import https from 'node:https';
import util from 'node:util';
import { then, recover, startP } from 'alleycat-js/es/async';
import { composeManyRight, toString, logWith } from 'alleycat-js/es/general';
import { yellow, green, warn, error, info } from 'alleycat-js/es/io';
import { isEmptyString, isNotEmptyList, anyV } from 'alleycat-js/es/predicate';
import yargsMod from 'yargs';
var inspect = function inspect(x) {
  return util.inspect(x, {
    depth: null,
    colors: process.stdout.isTTY
  });
};
var both = function both(f, g) {
  return function (x) {
    return pipe(x, againstAll([f, g]));
  };
};
// --- run promises in sequence. Each `f` returns a promise. (This is
// different than Promise.all, or our allP, which take promises, not
// functions. But we need the extra laziness to avoid the promises starting
// all at once).
var seqP = function seqP() {
  for (var _len = arguments.length, fs = new Array(_len), _key = 0; _key < _len; _key++) {
    fs[_key] = arguments[_key];
  }
  return pipe(startP(), composeManyRight.apply(void 0, _toConsumableArray(pipe(fs, map(then)))));
};
var yargs = yargsMod.usage('Usage: node $0 [options]').option('add', {
  string: true,
  describe: '...'
}).option('resend-welcome-email', {
  string: true,
  requiresArg: true,
  describe: '...'
}).option('cookie', {
  string: true,
  requiresArg: true,
  demandOption: true,
  describe: '...'
}).option('env', {
  choices: ['dev', 'tst', 'acc', 'prd'],
  requiresArg: true,
  demandOption: true,
  describe: '...'
}).strict().help('h').alias('h', 'help').showHelpOnFail(false, 'Specify --help for available options');
var opt = yargs.argv;
// --- showHelp also quits.
if (opt._.length !== 0) yargs.showHelp(error);
var chomp = function chomp(s) {
  return s.substring(0, s.length - 1);
};
var bad = againstAny([nil, isEmptyString]);
var badSendEmailInt = againstAny([bad, both(ne('1'), ne('0'))]);
var cookie = opt.cookie,
  env = opt.env,
  add = opt.add,
  resendWelcomeEmailRecipient = opt.resendWelcomeEmail;
var urls = {
  dev: 'https://fb-dev.alleycat.cc',
  tst: 'https://fb-tst.alleycat.cc',
  acc: 'https://fb-acc.alleycat.cc',
  prd: 'https://fondsenboek.com'
};
var url = urls[env];
if (nil(url)) error('Bad env/url');
if (nil(add) && nil(resendWelcomeEmailRecipient)) yargs.showHelp(error);
if (ok(add) && ok(resendWelcomeEmailRecipient)) yargs.showHelp(error);
var basicAuthPasswd = process.env.PASSWORD;
if (nil(basicAuthPasswd)) warn('Missing env PASSWORD');
var doRequest = function doRequest(cookie, url, method, dataObject) {
  var _ref = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {},
    _ref$basicAuthPasswd = _ref.basicAuthPasswd,
    basicAuthPasswd = _ref$basicAuthPasswd === void 0 ? null : _ref$basicAuthPasswd;
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify(dataObject);
    var options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Cookie': cookie
      }
    };
    if (basicAuthPasswd) options.auth = 'fb:' + basicAuthPasswd;
    var req = https.request(url, options, function (res) {
      res.setEncoding('utf8');
      var chunks = [];
      res.on('data', function (chunk) {
        return chunks.push(chunk);
      });
      res.on('end', function () {
        var code = res.statusCode;
        if (code === 200) {
          var body = pipe(pipe(chunks, join('')), JSON.parse);
          info('done, ok, got response:', inspect(body));
        } else info(pipe(code, sprintf1('done, not ok (status=%s), response:')), pipe(chunks, join('')));
        resolve(null);
      });
    });
    req.on('error', function (e) {
      warn(e);
      reject(e);
    });
    req.write(data);
    req.end();
  });
};
var addUser = function addUser(cookie, urlBase, email, firstName, lastName, sendEmail) {
  var _ref2 = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {},
    _ref2$basicAuthPasswd = _ref2.basicAuthPasswd,
    basicAuthPasswd = _ref2$basicAuthPasswd === void 0 ? null : _ref2$basicAuthPasswd;
  info('adding', yellow(email));
  var url = pipe([urlBase], sprintfN('%s/api/user-admin'));
  var dataObject = {
    data: {
      email: email,
      firstName: firstName,
      lastName: lastName,
      sendEmail: sendEmail,
      privileges: ['user']
    }
  };
  return doRequest(cookie, url, 'PUT', dataObject, {
    basicAuthPasswd: basicAuthPasswd
  });
};
var resendWelcomeEmail = function resendWelcomeEmail(cookie, urlBase, email) {
  var _ref3 = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {},
    basicAuthPasswd = _ref3.basicAuthPasswd;
  info('(re)sending email to', yellow(email));
  var url = pipe([urlBase], sprintfN('%s/api/user/send-welcome-email'));
  var data = {
    data: {
      email: email
    }
  };
  return doRequest(cookie, url, 'POST', data, {
    basicAuthPasswd: basicAuthPasswd
  });
};
if (add) {
  var contents = await fsP.readFile(add).then(toString);
  var promises = pipe(pipe(pipe(pipe(pipe(contents, chomp), split('\n')), filter(function (line) {
    return !line.match(/^\s*#/);
  })), map(function (line) {
    var _ref4 = pipe(line, split('\t')),
      _ref5 = _toArray(_ref4),
      email = _ref5[0],
      firstName = _ref5[1],
      lastName = _ref5[2],
      sendEmailInt = _ref5[3],
      rest = _ref5.slice(4);
    if (anyV(bad(email), bad(firstName), bad(lastName), badSendEmailInt(sendEmailInt), isNotEmptyList(rest))) error('Bad data');
    return [email, firstName, lastName, Boolean(Number(sendEmailInt))];
  })), map(function (_ref6) {
    var _ref7 = _slicedToArray(_ref6, 4),
      email = _ref7[0],
      firstName = _ref7[1],
      lastName = _ref7[2],
      sendEmail = _ref7[3];
    return function () {
      return addUser(cookie, url, email, firstName, lastName, sendEmail, {
        basicAuthPasswd: basicAuthPasswd
      });
    };
  }));
  seqP.apply(void 0, _toConsumableArray(promises));
} else if (resendWelcomeEmailRecipient) {
  resendWelcomeEmail(cookie, url, resendWelcomeEmailRecipient, {
    basicAuthPasswd: basicAuthPasswd
  });
}