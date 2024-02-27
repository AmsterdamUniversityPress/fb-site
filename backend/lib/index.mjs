import _slicedToArray from "@babel/runtime/helpers/slicedToArray";
import { pipe, compose, composeRight, sprintf1, tryCatch, lets, id, ifNil, die, factory, factoryProps } from 'stick-js/es';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import { get, listen, use, sendStatusEmpty } from 'alleycat-js/es/express';
import { yellow, green, red } from 'alleycat-js/es/io';
import { info, decorateRejection } from 'alleycat-js/es/general';
import configure from 'alleycat-js/es/configure';
import { errorX } from './io.mjs';
import { config } from './config.mjs';
import { main as initExpressJwt, bufferEqualsConstantTime as bufferEquals, hashPasswordScrypt as _hashPasswordScrypt, secureMethod } from 'alleycat-express-jwt';
var configTop = pipe(config, configure.init);
var _tryCatch = tryCatch(id, composeRight(decorateRejection("Couldn't load config: "), errorX), function () {
    return configTop.gets('dbPath', 'serverPort');
  }),
  dbPath = _tryCatch.dbPath,
  serverPort = _tryCatch.serverPort;
var initDb = function initDb() {
  info('opening db file at', pipe(dbPath, yellow));
};
var secureGet = secureMethod('get');
// const securePost = secureMethod ('post')
// ...

var JWT_SECRET = 'W@#$*nxnvxcv9f21jn13!!**j123n,mns,dg;';
var COOKIE_SECRET = 'j248idvnxcNNj;;;091!@#%***';
var PASSWORD_SALT = Buffer.from([0x75, 0x12, 0x23, 0x91, 0xAA, 0xAF, 0x53, 0x88, 0x90, 0xF1, 0xD4, 0xDD]);
var PASSWORD_KEYLEN = 64;
var hashPasswordScrypt = _hashPasswordScrypt(PASSWORD_SALT, PASSWORD_KEYLEN);
var getCredentials = function getCredentials() {
  return new Map([['allen@alleycat.cc', ['Allen', 'Haim', hashPasswordScrypt('appel')]], ['arie@alleycat.cc', ['arie', 'bombarie', hashPasswordScrypt('peer')]]]);
};
var credentials = getCredentials();

// --- must return { password, userinfo, }, where userinfo is an arbitrary
// structure which will be made available to the frontend.
var getUser = function getUser(email) {
  var user = credentials.get(email);
  if (!user) return null;
  var _user = _slicedToArray(user, 3),
    firstName = _user[0],
    lastName = _user[1],
    password = _user[2];
  return {
    password: password,
    userinfo: {
      email: email,
      firstName: firstName,
      lastName: lastName
    }
  };
};
var loggedIn = new Map();

// --- (String, Buffer) => Boolean
var checkPassword = function checkPassword(testPlain, knownHashed) {
  return lets(function () {
    return hashPasswordScrypt(testPlain);
  }, function (testHashed) {
    return pipe(testHashed, bufferEquals(knownHashed));
  });
};
var _initExpressJwt = initExpressJwt({
    checkPassword: checkPassword,
    getUser: getUser,
    getUserinfo: function getUserinfo(email) {
      return loggedIn.get(email);
    },
    jwtSecret: JWT_SECRET,
    onLogin: function onLogin(email, user) {
      return loggedIn.set(email, user);
    },
    onLogout: function onLogout(email, done) {
      if (loggedIn["delete"](email)) return done(null);
      return done('Unexpected, ' + email + ' not found in `loggedIn`');
    },
    usernameField: 'email'
  }),
  addLoginMiddleware = _initExpressJwt.addMiddleware;
var init = function init(_ref) {
  var port = _ref.port;
  return pipe(pipe(pipe(pipe(pipe(pipe(express(), use(bodyParser.json())), use(cookieParser(COOKIE_SECRET))), addLoginMiddleware) // --- only available to logged-in users
  , secureGet('/data', function (_req, res) {
    var event = new Date();
    var data = event.toLocaleTimeString('nl-NL');
    res.send({
      data: data
    });
  })) // --- always available
  , get('/data-public', function (_req, res) {
    var event = new Date();
    var data = event.toLocaleTimeString('nl-NL');
    res.send({
      data: data
    });
  })), listen(port)(function () {
    pipe(pipe(pipe(String(port), green), sprintf1('listening on port %s')), info);
  }));
};
init({
  port: serverPort
});