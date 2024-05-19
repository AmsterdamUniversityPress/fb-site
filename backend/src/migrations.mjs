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
  ]],
  [4, [
    {
      forwards: {
        sql: `create table privilege (id integer primary key autoincrement, privilege text not null)`,
        destructive: false,
      },
      backwards: {
        sql: `drop table privilege`,
        destructive: true,
      },
    },
    {
      forwards: {
        sql: `insert into privilege (privilege) values ('user'), ('admin-user')`,
        destructive: false,
      },
      backwards: {
        sql: `delete from privilege`,
        destructive: true,
      },
    },
    {
      forwards: {
        sql: `alter table userPrivilege rename to userPrivilege_old`,
        destructive: false,
      },
      backwards: {
        sql: `alter table userPrivilege_old rename to userPrivilege`,
        destructive: false,
      },
    },
    {
      forwards: {
        sql: `
          create table userPrivilege (
            id integer primary key autoincrement,
            userId integer not null,
            privilegeId integer not null
          )
        `,
        destructive: false,
      },
      backwards: {
        sql: `drop table userPrivilege`,
        destructive: true,
      },
    },
    {
      forwards: {
        sql: `create index userPrivilege_unique on userPrivilege (userId, privilegeId)`,
        destructive: false,
      },
      backwards: {
        sql: `drop index userPrivilege_unique`,
        destructive: false,
      },
    },
    {
      forwards: {
        sql: `
          insert into userPrivilege (id, userId, privilegeId)
          select id, userId,
          (select id from privilege p where p.privilege = up.privilege)
          from userPrivilege_old up
        `,
        destructive: false,
      },
      backwards: {
        sql: `delete from userPrivilege`,
        destructive: true,
      },
    },
  ]],
  [5, [
    {
      forwards: {
        // --- null is allowed, and means the user hasn't decided yet (this still means no consent
        // of course)
        sql: `alter table session add column analyticalAllowed smallint`,
        destructive: false,
      },
      backwards: {
        sql: `alter table session drop column analyticalAllowed`,
        destructive: true,
      },
    },
  ]],
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
