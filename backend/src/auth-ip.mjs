import {
  pipe, compose, composeRight,
  nil, ok, factory, factoryProps,
  each, appendM, whenOk,
} from 'stick-js/es'

import net from 'node:net'

import { lookupOnOrDie, } from './util.mjs'

const proto = {
  init (auth) {
    // --- it's called BlockList but can be used to simply check IPs in ranges
    const listMain = new net.BlockList ()
    this._lists = []
    this._infoCache = new Map ()

    auth | each (({ name, contact, type, ip_type, details, }) => {
      const blockListFunction = type | lookupOnOrDie ('bad type: ' + type) ({
        address: 'addAddress',
        subnet: 'addSubnet',
        range: 'addRange',
      })
      const typeParam = ip_type | lookupOnOrDie ('bad ip_type: ' + ip_type) ({
        v4: 'ipv4',
        v6: 'ipv6',
      })
      const listRule = new net.BlockList ()
      ; [listMain, listRule] | each (
        (list) => list [blockListFunction] (... details, typeParam),
      )
      this._lists | appendM ({ name, contact, list: listRule, })
    })

    this._listMain = listMain
    return this
  },
  check (ip) { return this._listMain.check (ip) },
  checkProxyIP (req) {
    const clientIP = this._ipForRequest (req)
    if (nil (clientIP)) return [false, 'no X-Forwarded-For header']
    return [this.check (clientIP), null]
  },
  getInfo (req) {
    const clientIP = this._ipForRequest (req)
    if (nil (clientIP)) return null
    const cached = this._infoCache.get (clientIP)
    if (ok (cached)) return cached
    return this._lists
      | find (({ list, ..._ }) => list.check (clientIP))
      | whenOk (({ name, contact, ... _ }) => ({ name, contact, }))
      | whenOk ((info) => {
        this._infoCache.set (clientIP, info)
        return info
      })
  },
  _ipForRequest (req) {
    // --- note that X-Forwarded-For is really easy to forge, so you must be
    // sure you trust the reverse proxy server.
    return req.headers ['x-forwarded-for']
  },
}

const props = {
  _infoCache: void 8,
  // --- one big structure which can efficiently check if an IP is authorized
  _listMain: void 8,
  // --- a list of structures, one per rule, through which we inefficiently
  // loop so we can map institution data to an IP address.
  _lists: void 8,
}

export const authIP = proto | factory | factoryProps (props)
