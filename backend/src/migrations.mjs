import {
  pipe, compose, composeRight,
} from 'stick-js'

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
        sql: 'create table new (id integer, color text)',
        destructive: false,
      },
      backwards: {
        sql: 'drop table new',
        destructive: true,
      },
    },
    {
      forwards: {
        sql: `alter table new add column shape text`,
        destructive: false,
      },
      backwards: {
        sql: `alter table new drop column shape`,
        destructive: true,
      },
    },
  ]],
  [3, [
    {
      forwards: {
        sql: `alter table new drop column color`,
        destructive: true,
      },
      backwards: {
        sql: `alter table new add column color text`,
        destructive: false,
      },
    },
  ]],
]
