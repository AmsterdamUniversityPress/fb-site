import {
  pipe, compose, composeRight,
  dot, dot2, ifOk,
  sprintfN, list, join, recurry,
} from 'stick-js/es'

import { createClient, } from 'redis'

import { recover, rejectP, resolveP, } from 'alleycat-js/es/async'
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

export const del = (key) => redisClient.del (key)
export const expire = (key, secs, opt) => redisClient.expire (key, secs, opt)
export const get = (key) => redisClient.get (key)
// --- e.g. `key ('activate', email)` -> 'activate:email', useful for storing various kinds of items
// in the same redis database (we're just using 0 for now)
export const key = list >> join (':')
export const set = recurry (2) (
  (key) => (value) => redisClient.set (key, value),
)
export const setExpire = recurry (3) (
  (secs) => (key) => (value) => batch (
    () => set (key, value),
    () => expire (key, secs),
  ) | recover (
    rejectP << decorateRejection ('setExpire (): '),
  ),
)
export const _getDelete = (failOnNull, doDelete, key) => batch (
  () => get (key),
  (value) => value | ifOk (
    () => resolveP (null),
    () => {
      if (failOnNull) return rejectP ([key] | sprintfN ('key ‘%s’ was null'))
      resolveP (null)
    },
  ),
  () => doDelete && del (key),
  (value, ... _) => value,
)
export const getDelete = (key) => _getDelete (false, true, key)
export const getDeleteFail = (key) => _getDelete (true, true, key)
export const getFail = (key) => _getDelete (true, false, key)
