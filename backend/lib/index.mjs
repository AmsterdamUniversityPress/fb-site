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

// import {
// main as initExpressJwt,
// bufferEqualsConstantTime as bufferEquals,
// hashPasswordScrypt as _hashPasswordScrypt,
// secureMethod,
// } from '../../../jslib/index.mjs'

var configTop = pipe(config, configure.init);
var _tryCatch = tryCatch(id, composeRight(decorateRejection("Couldn't load config: "), errorX), function () {
    return configTop.gets('dbPath', 'serverPort');
  }),
  dbPath = _tryCatch.dbPath,
  serverPort = _tryCatch.serverPort;
var initDb = function initDb() {
  info('opening db file at', pipe(dbPath, yellow));
};

// const secureGet = secureMethod ('get')
// const securePost = secureMethod ('post')
// ...

var port = 4444;
var JWT_SECRET = 'W@#$*nxnvxcv9f21jn13!!**j123n,mns,dg;';
var COOKIE_SECRET = 'j248idvnxcNNj;;;091!@#%***';
var PASSWORD_SALT = Buffer.from([0x75, 0x12, 0x23, 0x91, 0xAA, 0xAF, 0x53, 0x88, 0x90, 0xF1, 0xD4, 0xDD]);
var PASSWORD_KEYLEN = 64;

// const hashPasswordScrypt = _hashPasswordScrypt (PASSWORD_SALT, PASSWORD_KEYLEN)

// const getCredentials = () => new Map ([
// ['allen@alleycat.cc', ['Allen', 'Haim', hashPasswordScrypt ('appel')]],
// ['arie@alleycat.cc', ['arie', 'bombarie', hashPasswordScrypt ('peer')]],
// ])
// const credentials = getCredentials ()

// --- must return { password, userinfo, }, where userinfo is an arbitrary
// structure which will be made available to the frontend.
// const getUser = (email) => {
// const user = credentials.get (email)
// if (!user) return null
// const [firstName, lastName, password] = user
// return {
// password,
// userinfo: {
// email,
// firstName,
// lastName,
// },
// }
// }

var loggedIn = new Map();

// --- (String, Buffer) => Boolean
// const checkPassword = (testPlain, knownHashed) => lets (
// () => hashPasswordScrypt (testPlain),
// (testHashed) => testHashed | bufferEquals (knownHashed),
// )

// const { addMiddleware: addLoginMiddleware, } = initExpressJwt ({
// checkPassword,
// getUser,
// getUserinfo: (email) => loggedIn.get (email),
// jwtSecret: JWT_SECRET,
// onLogin: (email, user) => loggedIn.set (email, user),
// onLogout: (email, done) => {
// if (loggedIn.delete (email)) return done (null)
// return done ('Unexpected, ' + email + ' not found in `loggedIn`')
// },
// usernameField: 'email',
// })

var proto = {
  init: function init(_ref) {
    var _this = this;
    var port = _ref.port,
      onReady = _ref.onReady;
    this._express = pipe(pipe(pipe(pipe(pipe(express(), use(bodyParser.json())), use(cookieParser(COOKIE_SECRET))) // | addLoginMiddleware
    // --- only available to logged-in users
    // | secureGet ('/data', (_req, res) => {
    // const event = new Date ()
    // const data = event.toLocaleTimeString ('nl-NL')
    // res.send ({ data, })
    // })
    // --- always available
    , get('/data-public', function (_req, res) {
      var event = new Date();
      var data = event.toLocaleTimeString('nl-NL');
      res.send({
        data: data
      });
    })), get('/stop-server', function (_req, res) {
      compose(info, red('hehe, stopping the server'));
      _this.stop();
      sendStatusEmpty(200);
    })), listen(port)(function () {
      return onReady(port);
    }));
    return this;
  },
  stop: function stop() {
    info('stopping web server');
    pipe(this._express, ifNil(function () {
      return die("Can't stop web server (never initialized?)");
    }, function (app) {
      return composeRight(app.close(), die("closed"));
    }));
  }
};
var props = {
  _express: void 8
};
var serverMod = pipe(pipe(proto, factory), factoryProps(props));
var initServer = function initServer(_ref2) {
  var port = _ref2.port;
  var serverM = serverMod.create().init({
    port: port,
    // :: Number |port| -> IO ()
    onReady: composeRight(composeRight(composeRight(String, green), sprintf1('listening on port %s')), info)
  });
  return serverM;
};
initServer({
  port: serverPort
});