import {
  pipe, compose, composeRight,
  dot, dot1, dot2,
  sprintfN,
} from 'stick-js/es'

import { createClient, } from 'redis'

import { recover, rejectP, } from 'alleycat-js/es/async'
import { decorateRejection, } from 'alleycat-js/es/general'
import { warn, } from 'alleycat-js/es/io'
import { letsP, } from 'alleycat-js/es/lets-promise'

let redisClient

const on = dot2 ('on')
const connect = dot ('connect')

const conn = (url, reconnectTimeoutMs) => createClient ({
  url,
  socket: {
    reconnectStrategy: (_retries, cause) => {
      warn ([reconnectTimeoutMs, cause] | sprintfN (
        `Redis client disconnected or can't establish connection, retrying in %s seconds, reason: %s`,
      ))
      return reconnectTimeoutMs * 1000
    }
  }
})

const mkClientP = async (url, reconnectTimeoutMs) => conn (url, reconnectTimeoutMs)
  | on ('error', (err) => warn ([err] | sprintfN ('Error with redis client: %s')))
  | connect

// --- e.g. url: 'redis://:the-password/127.0.0.1:6379/0'
export const init = async (url, reconnectTimeoutMs) => {
  redisClient = await mkClientP (url, reconnectTimeoutMs)
}

export const batch = (... fs) => letsP (... fs) | recover (
  rejectP << decorateRejection ('Error with redis pipeline: ')
)

export const get = (key) => redisClient.get (key)
export const del = (key) => redisClient.del (key)
export const expire = (key, secs, opt) => redisClient.expire (key, secs, opt)
export const set = (key, value) => redisClient.set (key, value)
export const getRemove = (key) => batch (
  () => get (key),
  () => del (key),
  (value, _) => value,
)

// --- @experimental maybe something like
// await redisSetExpire (10) ('abc', 'bdef')
