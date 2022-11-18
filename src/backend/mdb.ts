import {RedisConnectionPool} from 'redis-connection-pool'

declare type MDBConfig = {
    host?:string,
    port?:number,
    password?:string,
    max_clients?:number,
    db?:string,
    prefix?:string
}

const K_MDB_CONNECTION_POOL = Symbol()
const K_MDB_KEY_PREFIX = Symbol()

export class MDB{
    /** @internal */ private [K_MDB_KEY_PREFIX]:string
    /** @internal */ private [K_MDB_CONNECTION_POOL]:RedisConnectionPool

    constructor(cfg:MDBConfig) {
        if (!cfg) cfg = {}
        if (!cfg.host) cfg.host = "127.0.0.1"
        if (!cfg.port) cfg.port = 6379
        if (!cfg.max_clients) cfg.max_clients = 10
        if (!cfg.db) cfg.db = '0'
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
        this[K_MDB_CONNECTION_POOL] = new RedisConnectionPool(redis_cfg)
    }

    async set (key:string, val:string|number, ttl?:number):Promise<string|null> {
        return this[K_MDB_CONNECTION_POOL].set(this[K_MDB_KEY_PREFIX]+key, val, ttl)
    }

    async get (key:string):Promise<string> {
        return this[K_MDB_CONNECTION_POOL].get(this[K_MDB_KEY_PREFIX]+key)
    }

    async expire (key:string, ttl:number):Promise<number> {
        return this[K_MDB_CONNECTION_POOL].expire(this[K_MDB_KEY_PREFIX]+key, ttl)
    }

    async ttl(key:string):Promise<number> {
        return this[K_MDB_CONNECTION_POOL].ttl(this[K_MDB_KEY_PREFIX]+key)
    }

    async del (key:string):Promise<number> {
        return this[K_MDB_CONNECTION_POOL].del(this[K_MDB_KEY_PREFIX]+key)
    }

    async hget (key:string, field:string):Promise<string> {
        return this[K_MDB_CONNECTION_POOL].hget(this[K_MDB_KEY_PREFIX]+key, field)
    }

    async hgetall (key:string):Promise<{[k:string]:string}> {
        return this[K_MDB_CONNECTION_POOL].hgetall(this[K_MDB_KEY_PREFIX]+key)
    }

    async hset (key:string, field:string, val:string):Promise<number> {
        return this[K_MDB_CONNECTION_POOL].hset(this[K_MDB_KEY_PREFIX]+key, field, val)
    }

    async hseto (key:string, obj:{[k:string]:string}) {
        if (!obj) return null
        let jobs = [] as Array<Promise<number>>
        for (let f in obj)
            jobs.push(this.hset(key, f, obj[f]))
        let cc = await Promise.all(jobs)
        for (let err of cc){
            if (err)
                return err
        }
        return null
    }

    async hdel (key:string, fields:string[]):Promise<number> {
        return this[K_MDB_CONNECTION_POOL].hdel(this[K_MDB_KEY_PREFIX]+key, fields)
    }

    async brpop (key:string) {
        return this[K_MDB_CONNECTION_POOL].brpop(this[K_MDB_KEY_PREFIX]+key)
    }

    async blpop (key:string) {
        return this[K_MDB_CONNECTION_POOL].blpop(this[K_MDB_KEY_PREFIX]+key)
    }

    async rpush (key:string, val:string) {
        return this[K_MDB_CONNECTION_POOL].rpush(this[K_MDB_KEY_PREFIX]+key, val)
    }

    async lpush (key:string, val:string) {
        return this[K_MDB_CONNECTION_POOL].lpush(this[K_MDB_KEY_PREFIX]+key, val)
    }
}
