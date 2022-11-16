declare type DBConfig={
    host?:string,            // MySQL 服务地址
    user?:string,            // 账号
    password?:string,        // 密码
    port?:number,            // 端口
    database?:string         // 数据库名
}

declare class DBBase{
    fetch(sql:string, param:Array<any>):Promise<object|null>
    fetchone(sql:string, param:Array<any>):Promise<object|null>
    exec(sql:string, param:Array<any>):Promise<object|null>
    insert(table:string, values:object):Promise<number|null>
    update(table:string, values:object, where?:string, condv?:object):Promise<boolean>        
}

declare class Transaction{
    query(sql_str:string, params:Array<any>):Promise<DBResult>
    commit():Promise<boolean>
    rollback():Promise<false>
}

declare type DBResult={ok:boolean, result:string}

export class DB extends DBBase {
    /**
     * 构造一个 DB 对象
     * @param {Object} cfg 
     * @example
     * const cfg = {
     *     host: "127.0.0.1",       // MySQL 服务地址
     *     user: "root",            // 账号
     *     password: "123",         // 密码
     *     port: 3306,              // 端口
     *     database: "db"           // 数据库名
     * }
     */
    constructor(cfg:DBConfig)
    query(sql_str:string, params:Array<any>):Promise<DBResult>
    begin():Promise<Transaction>
    do(func:(tr:Transaction)=>Promise<boolean>):Promise<boolean>
}