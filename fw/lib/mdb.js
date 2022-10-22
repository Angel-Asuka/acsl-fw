'use strict'

/*
    内存数据库模块
    cfg = {
        host: 【可选】数据库地址,
        port: 【可选】数据库端口
        password: 【可选】数据库密码,
        max_clients: 【可选】最大连接数
        db: 【可选】数据库编号,
        prefix: 【可选】键名前缀
    }
*/

import * as Redis_ConnectionPool from 'redis-connection-pool'

const K_MDB_CONNECTION_POOL = Symbol()
const K_MDB_KEY_PREFIX = Symbol()

class MDB{
    constructor(cfg) {
        if (!cfg) cfg = {}
        if (!cfg.host) cfg.host = "127.0.0.1"
        if (!cfg.port) cfg.port = 6379
        if (!cfg.max_clients) cfg.max_clients = 10
        if (!cfg.db) cfg.db = 0
        let redis_cfg = {
            host: cfg.host,
            port: cfg.port,
            max_clients: cfg.max_clients,
            perform_checks: false,
            database: cfg.db,
            options: {
                auth_pass: cfg.password
            }
        }
        this[K_MDB_KEY_PREFIX] = cfg.prefix || ''
        this[K_MDB_CONNECTION_POOL] = Redis_ConnectionPool.default('langleyRedisPool', redis_cfg)
    }

    async set (key, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].set(this[K_MDB_KEY_PREFIX]+key, val, (err) => {
                resolve(err)
            })
        })
    }

    async get (key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].get(this[K_MDB_KEY_PREFIX]+key, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async expire (key, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].expire(this[K_MDB_KEY_PREFIX]+key, val, (err, val) => {
                resolve(err)
            })
        })
    }

    async ttl(key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].ttl(this[K_MDB_KEY_PREFIX]+key, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async del (key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].del(this[K_MDB_KEY_PREFIX]+key, (err) => {
                resolve(err)
            })
        })
    }

    async hget (key, field) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].hget(this[K_MDB_KEY_PREFIX]+key, field, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async hgetall (key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].hgetall(this[K_MDB_KEY_PREFIX]+key, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async hset (key, field, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].hset(this[K_MDB_KEY_PREFIX]+key, field, val, (err) => {
                resolve(err)
            })
        })
    }

    async hseto (key, obj) {
        if (!obj) return null
        let jobs = []
        for (let f in obj)
            jobs.push(this.hset(key, f, obj[f]))
        let cc = await Promise.all(jobs)
        for (let err of cc){
            if (err)
                return err
        }
        return null
    }

    async hdel (key, fields) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].hdel(this[K_MDB_KEY_PREFIX]+key, fields, (err) => {
                resolve(err)
            })
        })
    }

    async brpop (key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].brpop(this[K_MDB_KEY_PREFIX]+key, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async blpop (key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].blpop(this[K_MDB_KEY_PREFIX]+key, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async rpush (key, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].rpush(this[K_MDB_KEY_PREFIX]+key, val, (err) => {
                resolve(err)
            })
        })
    }

    async lpush (key, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].lpush(this[K_MDB_KEY_PREFIX]+key, val, (err) => {
                resolve(err)
            })
        })
    }
}

export {MDB}