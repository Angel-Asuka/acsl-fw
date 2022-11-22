import {createClient, RedisClientType} from 'redis'
import {createPool, Pool} from 'generic-pool'

declare type MDBConfig = {
    host?:string,
    port?:number,
    user?:string,
    password?:string,
    max_clients?:number,
    secure?:boolean,
    db?:string,
    prefix?:string
}

const K_MDB_CONNECT_STR = Symbol()
const K_MDB_CONNECTION_POOL = Symbol()
const K_MDB_KEY_PREFIX = Symbol()
const K_MDB_ON_CREATE_CLIENT = Symbol()
const K_MDB_ON_DESTROY_CLIENT = Symbol()

export class MDB{
    /** @internal */ private [K_MDB_CONNECT_STR]:string
    /** @internal */ private [K_MDB_KEY_PREFIX]:string
    /** @internal */ private [K_MDB_CONNECTION_POOL]:Pool<RedisClientType>

    constructor({
        host = '127.0.0.1',
        port = 6379,
        user = undefined,
        password = undefined,
        max_clients = 10,
        secure = false,
        db = undefined,
        prefix = ''
    }:MDBConfig = {}) {
        this[K_MDB_KEY_PREFIX] = prefix || ''
        this[K_MDB_CONNECT_STR] = secure?'rediss://':'redis://'
        if(user != undefined || password != undefined){
            this[K_MDB_CONNECT_STR] += user || ''
            this[K_MDB_CONNECT_STR] += password?`:${password}`:''
            this[K_MDB_CONNECT_STR] += '@'
        }
        this[K_MDB_CONNECT_STR] += `${host}:${port}`
        if(db != undefined) this[K_MDB_CONNECT_STR] += `:${db}`
        this[K_MDB_CONNECTION_POOL] = createPool<RedisClientType>({
            create: this[K_MDB_ON_CREATE_CLIENT].bind(this),
            destroy: this[K_MDB_ON_DESTROY_CLIENT].bind(this)
        },{min:1, max:max_clients})
    }

    /** @internal */
    private async [K_MDB_ON_CREATE_CLIENT]():Promise<RedisClientType>{
        const client = <RedisClientType>createClient({url:this[K_MDB_CONNECT_STR]})
        client.on('error', (err)=>console.log(err))
        await client.connect()
        return client
    }

    /** @internal */
    private async [K_MDB_ON_DESTROY_CLIENT](client:RedisClientType){
        await client.quit()
    }

    async Call(method:string, args: Array<any> = []):Promise<any>{
        const cli:any = await this[K_MDB_CONNECTION_POOL].acquire()
        const ret:any = await cli[method](...args)
        await this[K_MDB_CONNECTION_POOL].release(cli)
        return ret
    }

    async set (key:string, val:string|number, ttl?:number):Promise<string|null> {
        return this.Call('SET', [this[K_MDB_KEY_PREFIX]+key, val, {EX: ttl}])
    }

    async get (key:string):Promise<string|null> {
        return this.Call('GET', [this[K_MDB_KEY_PREFIX]+key])
    }

    async exists (...keys:Array<string>):Promise<number> {
        return this.Call('EXISTS', keys.map((x)=>{return this[K_MDB_KEY_PREFIX]+x}))
    }

    async expire (key:string, ttl:number, mode?:'NX' | 'XX' | 'GT' | 'LT'):Promise<number> {
        return this.Call('EXPIRE', [this[K_MDB_KEY_PREFIX]+key, ttl, mode])
    }

    async ttl(key:string):Promise<number> {
        return this.Call('TTL', [this[K_MDB_KEY_PREFIX]+key])
    }

    async del (...keys:Array<string>):Promise<number> {
        return this.Call('DEL', keys.map((x)=>{return this[K_MDB_KEY_PREFIX]+x}))
    }

    async hget (key:string, field:string):Promise<string|null> {
        return this.Call('HGET', [this[K_MDB_KEY_PREFIX]+key, field])
    }

    async hgetall (key:string):Promise<{[k:string]:string}|null> {
        return this.Call('HGETALL', [this[K_MDB_KEY_PREFIX]+key])
    }

    async hset (key:string, field:string, val:string|number):Promise<number> {
        return this.Call('HSET', [this[K_MDB_KEY_PREFIX]+key, field, val])
    }

    async hseto (key:string, obj:{[k:string]:string|number}) {
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

    async hdel (key:string, ...fields:string[]):Promise<number> {
        return this.Call('HDEL', [this[K_MDB_KEY_PREFIX]+key, fields])
    }

    async lpush(key:string, ...vals:Array<string|number>):Promise<number> {
        return this.Call('LPUSH', [key, vals])
    }

    async lpushx(key:string, ...vals:Array<string|number>):Promise<number> {
        return this.Call('LPUSHX', [key, vals])
    }

    async lpop(key:string):Promise<string|null> {
        return this.Call('LPOP', [key])
    }

    async rpush(key:string, ...vals:Array<string|number>):Promise<number> {
        return this.Call('RPUSH', [key, vals])
    }

    async rpushx(key:string, ...vals:Array<string|number>):Promise<number> {
        return this.Call('RPUSHX', [key, vals])
    }

    async rpop(key:string):Promise<string|null> {
        return this.Call('RPOP', [key])
    }

    async llen(key:string):Promise<number> {
        return this.Call('LLEN', [key])
    }

    async lindex(key:string, idx:number):Promise<string|null> {
        return this.Call('LINDEX', [key, idx])
    }
}
