import { Context } from "hono";
import { drizzle } from "drizzle-orm/libsql";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createClient } from '@libsql/client';

/*
【致开发者】
感谢您的贡献，核心数据库结构，请尽量避免修改。
如果需要做结构上的变动，请先在GitHub讨论区发帖。
*/

export const DB = function () {
    const db = createClient({
        url: "file:app.db",
        syncUrl: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
        syncInterval: 60,
    });
    return drizzle(db, { logger: false });
}()

export const Conf = sqliteTable("conf", {
    key: text().primaryKey(),
    value: text(),
});

export const Message = sqliteTable("message", {
    uid: integer().notNull().default(0), // 向哪个用户发送的消息
    type: integer().notNull().default(0), // 消息类别 1:回复提醒 -1:已读回复提醒
    time: integer().notNull().default(0), // 消息时间 要和帖子一致
    pid: integer().notNull().default(0), // 关联帖子
    /*
    pid 足够了，数据列越少越好。
    根据 pid 可以递归查询所在主题、发帖人。
    post将来也可以存储用户私信，管理员消息。
    不要建立主键ID！因为无法追溯，完全多余。
    比如用户删除掉一条回复，系统也要删除被回复用户的消息。
    通过 uid_type_time_pid 才可以找到相应的消息，用主键无法定位。
    */
}, (table) => [
    index("message:uid,type,time,pid").on(table.uid, table.type, table.time, table.pid),
]);

export const Post = sqliteTable("post", {
    pid: integer().primaryKey(),
    tid: integer().notNull().default(0),
    uid: integer().notNull().default(0),
    time: integer().notNull().default(0),
    access: integer().notNull().default(0),
    quote_pid: integer().notNull().default(0),
    content: text().notNull().default(''),
}, (table) => [
    index("post:access,tid,pid").on(table.access, table.tid, table.pid), // 帖子内的回复
    index("post:access,uid,tid,pid").on(table.access, table.uid, table.tid, table.pid), // 帖子内某个用户的回复
]);

export const Thread = sqliteTable("thread", {
    tid: integer().primaryKey(),
    uid: integer().notNull().default(0),
    time: integer().notNull().default(0),
    access: integer().notNull().default(0),
    is_top: integer().notNull().default(0),
    last_time: integer().notNull().default(0),
    last_uid: integer().notNull().default(0),
    posts: integer().notNull().default(0),
    subject: text().notNull().default(''),
}, (table) => [
    index("thread:access,is_top,last_time").on(table.access, table.is_top, table.last_time), // 按帖子置顶与最后回复排序
    index("thread:access,uid,time").on(table.access, table.uid, table.time), // 按用户发帖时间排序
]);

export const User = sqliteTable("user", {
    uid: integer().primaryKey(),
    gid: integer().notNull().default(0),
    time: integer().notNull().default(0),
    mail: text().notNull().default('').unique(),
    name: text().notNull().default('').unique(),
    hash: text().notNull().default(''),
    salt: text().notNull().default(''),
    threads: integer().notNull().default(0),
    posts: integer().notNull().default(0),
    credits: integer().notNull().default(0),
    golds: integer().notNull().default(0),
});

export type I = Omit<typeof User.$inferSelect, "hash" | "salt">

export interface Props {
    a: Context
    i: I | undefined
    title: string
    external?: string
}