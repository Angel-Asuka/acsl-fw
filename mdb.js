'use strict'

/*
    内存数据库模块
    cfg = {
        host: 【可选】数据库地址,
        port: 【可选】数据库端口
        password: 【可选】数据库密码,
        max_clients: 【可选】最大连接数
        db: 【可选】数据库编号,
    }
*/

const Redis_Driver = require('redis')
const Redis_ConnectionPool = require('redis-connection-pool')

const K_MDB_CONNECTION_POOL = Symbol()

module.exports = (__l)=>{return class {
    constructor(cfg) {
        this.Langley = __l
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
        this[K_MDB_CONNECTION_POOL] = Redis_ConnectionPool('langleyRedisPool', redis_cfg)
    }

    async set (key, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].set(key, val, (err) => {
                resolve(err)
            })
        })
    }

    async get (key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].get(key, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async expire (key, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].expire(key, val, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async del (key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].del(key, (err) => {
                resolve(err)
            })
        })
    }

    async hget (key, field, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].hget(key, field, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async hgetall (key, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].hgetall(key, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async hset (key, field, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].hset(key, field, val, (err) => {
                resolve(err)
            })
        })
    }

    async hdel (key, fields, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].hdel(key, fields, val, (err) => {
                resolve(err)
            })
        })
    }

    async brpop (key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].brpop(key, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async blpop (key) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].blpop(key, (err, val) => {
                if (err)
                    resolve(null)
                else
                    resolve(val)
            })
        })
    }

    async rpush (key, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].rpush(key, val, (err) => {
                resolve(err)
            })
        })
    }

    async lpush (key, val) {
        return new Promise(resolve => {
            this[K_MDB_CONNECTION_POOL].lpush(key, val, (err) => {
                resolve(err)
            })
        })
    }
}}