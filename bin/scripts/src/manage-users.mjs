#!/usr/bin/env node

import {
  pipe, compose, composeRight,
  nil, ok, split, filter, map, each, join, sprintf1,
  tap, againstAny, againstAll, ne, die, sprintfN,
} from 'stick-js/es'

import { Buffer, } from 'node:buffer'
import fsP from 'node:fs/promises'
import https from 'node:https'
import util from 'node:util'

import { then, recover, startP, } from 'alleycat-js/es/async'
import { composeManyRight, toString, logWith, } from 'alleycat-js/es/general'
import { yellow, green, warn, error, info, } from 'alleycat-js/es/io'
import { isEmptyString, isNotEmptyList, anyV, } from 'alleycat-js/es/predicate'

// import { lookupOnOrDie, } from '../../../backend/lib/util'

import yargsMod from 'yargs'

const inspect = x => util.inspect (x, { depth: null, colors: process.stdout.isTTY, })
const both = (f, g) => (x) => x | againstAll ([f, g])
// --- run promises in sequence. Each `f` returns a promise. (This is
// different than Promise.all, or our allP, which take promises, not
// functions. But we need the extra laziness to avoid the promises starting
// all at once).
const seqP = (... fs) => startP () | composeManyRight (
  ... fs | map (then),
)

const yargs = yargsMod
  .usage ('Usage: node $0 [options]')
  .option ('add', {
    string: true,
    describe: '...',
  })
  .option ('resend-welcome-email', {
    string: true,
    requiresArg: true,
    describe: '...',
  })
  .option ('cookie', {
    string: true,
    requiresArg: true,
    demandOption: true,
    describe: '...',
  })
  .option ('env', {
    choices: ['dev', 'tst', 'acc', 'prd'],
    requiresArg: true,
    demandOption: true,
    describe: '...',
  })
  .strict ()
  .help ('h')
  .alias ('h', 'help')
  .showHelpOnFail (false, 'Specify --help for available options')

const opt = yargs.argv
// --- showHelp also quits.
if (opt._.length !== 0)
  yargs.showHelp (error)

const chomp = (s) => s.substring (0, s.length - 1)

const bad = againstAny ([nil, isEmptyString])
const badSendEmailInt = againstAny ([bad, both (ne ('1'), ne ('0'))])

const { cookie, env, add, resendWelcomeEmail: resendWelcomeEmailRecipient, } = opt

const urls = {
  dev: 'https://fb-dev.alleycat.cc',
  tst: 'https://fb-tst.alleycat.cc',
  acc: 'https://fb-acc.alleycat.cc',
  prd: 'https://fondsenboek.com',
}
const url = urls [env]
if (nil (url)) error ('Bad env/url')

if (nil (add) && nil (resendWelcomeEmailRecipient))
  yargs.showHelp (error)
if (ok (add) && ok (resendWelcomeEmailRecipient))
  yargs.showHelp (error)

const basicAuthPasswd = process.env.PASSWORD
if (nil (basicAuthPasswd)) warn ('Missing env PASSWORD')

// const url = env | lookupOnOrDie ('Bad env: ' + brightRed (env))

const doRequest = (cookie, url, method, dataObject, { basicAuthPasswd=null, }={}, ) => new Promise ((resolve, reject) => {
  const data = JSON.stringify (dataObject)
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength (data),
      'Cookie': cookie,
    },
  }
  if (basicAuthPasswd) options.auth = 'fb:' + basicAuthPasswd

  const req = https.request (
    url,
    options,
    (res) => {
      res.setEncoding ('utf8')
      const chunks = []
      res.on ('data', (chunk) => chunks.push (chunk))
      res.on ('end', () => {
        const code = res.statusCode
        if (code === 200) {
          const body = chunks | join ('') | JSON.parse
          info ('done, ok, got response:', inspect (body))
        }
        else info (code | sprintf1 ('done, not ok (status=%s), response:'), chunks | join (''))
        resolve (null)
      })
    }
  )
  req.on ('error', (e) => {
    warn (e)
    reject (e)
  })
  req.write (data)
  req.end ()
})

const addUser = (cookie, urlBase, email, firstName, lastName, sendEmail, { basicAuthPasswd=null, }={}) => {
  info ('adding', yellow (email))
  const url = [urlBase] | sprintfN ('%s/api/user-admin')
  const dataObject = { data: {
    email,
    firstName,
    lastName,
    sendEmail,
    privileges: ['user'],
  }}
  return doRequest (cookie, url, 'PUT', dataObject, { basicAuthPasswd, })
}

const resendWelcomeEmail = (cookie, urlBase, email, { basicAuthPasswd, } = {}, ) => {
  info ('(re)sending email to', yellow (email))
  const url = [urlBase] | sprintfN ('%s/api/user/send-welcome-email')
  const data = { data: { email, }}
  return doRequest (cookie, url, 'POST', data, { basicAuthPasswd, })
}

if (add) {
  const contents = await fsP.readFile (add).then (toString)
  const promises = contents
    | chomp
    | split ('\n')
    | filter ((line) => !line.match (/^\s*#/))
    | map ((line) => {
      const [email, firstName, lastName, sendEmailInt, ... rest] = line | split ('\t')
      if (anyV (
        bad (email),
        bad (firstName),
        bad (lastName),
        badSendEmailInt (sendEmailInt),
        isNotEmptyList (rest),
      )) error ('Bad data')
      return [email, firstName, lastName, Boolean (Number (sendEmailInt))]
    })
    | map (([email, firstName, lastName, sendEmail]) => {
      return () => addUser (cookie, url, email, firstName, lastName, sendEmail, { basicAuthPasswd, })
    })
  seqP (... promises)
}
else if (resendWelcomeEmailRecipient) {
  resendWelcomeEmail (cookie, url, resendWelcomeEmailRecipient, { basicAuthPasswd, })
}
