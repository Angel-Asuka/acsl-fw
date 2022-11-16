declare type MDBConfig = {
    host?:string,
    port?:number,
    password?:string,
    max_clients?:number,
    db?:string,
    prefix?:string
}

export class MDB{
    constructor(cfg:MDBConfig)
    set(key:string, val:string|number):Promise<object>
    get(key:string):Promise<string|null>
    expire(key:string, val:string|number):Promise<object>
    ttl(key:string):Promise<string|null>
    del(key:string):Promise<object>
    hget(key:string, field:string):Promise<string|null>
    hgetall(key:string):Promise<object|null>
    hset(key:string, field:string, val:string|number):Promise<object>
    hseto(key:string, obj:object):Promise<object|null>
    hdel(key:string, fields:string):Promise<object>
    brpop(key:string):Promise<any>
    blpop(key:string):Promise<any>
    rpush(key:string, val:string|number):Promise<any>
    lpush(key:string, val:string|number):Promise<any>
}