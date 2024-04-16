import {
  pipe, compose, composeRight,
} from 'stick-js'

import { S, SB, } from 'alleycat-js/es/bsqlite3'

// --- we consider version 0 as the empty database

export default [
  [0, []],
  [1, [
    {
      forwards: {
        sql: `create table user (
          id integer primary key autoincrement,
          email text unique not null,
          firstName text,
          lastName text,
          password text
        )`,
        destructive: false,
      },
      backwards: {
        sql: `drop table user`,
        destructive: true,
      },
    },
    {
      forwards: {
        sql: `create table loggedIn (
          id integer primary key autoincrement,
          userId int not null,
          unique (userId)
        )`,
        destructive: false,
      },
      backwards:{
        sql: `drop table loggedIn`,
        destructive: true,
      },
    },
    {
      forwards: {
        sql: `create table userPrivilege (
          id integer primary key autoincrement,
          userId int not null,
          privilege string not null,
          unique (userId, privilege)
        )`,
        destructive: false,
      },
      backwards:{
        sql: `drop table userPrivilege`,
        destructive: true,
      },
    },
  ]],
  [2, [
    {
      forwards: {
        sql: `drop table loggedIn`,
        destructive: true,
      },
      backwards: {
        sql: `create table loggedIn (
          id integer primary key autoincrement,
          userId int not null,
          unique (userId)
        )`,
        destructive: false,
      },
    },
    {
      forwards: {
        // --- don't use 'unique' in the 'create table' statement, because it's impossible to change later -- better to use 'create
        // unique index', which enforces the same constraint, but is changeable.
        sql: `create table loggedIn (
          id integer primary key autoincrement,
          userId int not null,
          sessionId text not null,
          lastRefreshed int not null
        )`,
        destructive: false,
      },
      backwards: {
        sql: `drop table loggedIn`,
        destructive: true,
      },
    },
    {
      forwards: {
        sql: `create unique index loggedIn_unique on loggedIn (userId, sessionId)`,
        destructive: false,
      },
      backwards: {
        sql: `drop index loggedIn_unique`,
        destructive: true,
      },
    },
  ]],
  [3, [
    {
      forwards: {
        sql: `alter table loggedIn rename to session`,
        destructive: false,
      },
      backwards: {
        sql: `alter table session rename to loggedIn`,
        destructive: false,
      },
    },
  ]]
  /*
    {
      forwards: {
        sql: `
        `,
        destructive: ,
      },
      backwards: {
        sql: `
        `,
        destructive: ,
      },
    },
  */
]
