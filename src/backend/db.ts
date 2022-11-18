import * as MySQL_Driver from 'mysql'

const K_TRANSACTION_CONN = Symbol()

declare type QueryResult = {
    ok: boolean,
    result: any
}

class DBBase {
    constructor(){}
    
    CURRENT_TIMESTAMP(){ return 'CURRENT_TIMESTAMP' }

    async query(sql_str:string, params:any): Promise<QueryResult>{
        return new Promise((resolve, reject) => {resolve({ok:false, result:'NOT_IMP'})})
    }

    async fetch(sql:string, param:any){
        const ret = await this.query(sql, param)
        if(ret.ok) return ret.result
        console.log(ret)
        return null
    }

    async fetchone(sql:string, param:any){
        const ret = await this.query(sql, param)
        if(ret.ok && ret.result.length) return ret.result[0]
        if(!ret.ok) console.log(ret)
        return null
    }

    async exec(sql:string, param:any){
        const ret = await this.query(sql, param)
        if(!ret.ok) console.log(ret)
        return ret.ok
    }

    async insert(table:string, values:{[k:string]:string|(()=>string)}){
        const keys = [] as string[];
        const vals = [] as string[];
        const data = [] as string[];
        for (let k in values){
            keys.push(k);
            const val = values[k]
            if(typeof val === 'function')
                vals.push(val())
            else {
                vals.push('?')
                data.push(val)
            }
        }
        const sql_str = `INSERT INTO \`${table}\` (\`${keys.join('`,`')}\`)VALUES(${vals.join(',')})`
        const ret = await(this.query(sql_str, data))
        if (ret.ok) return ret.result.insertId
        console.log(ret)
        return null
    }

    async update(table:string, values:{[k:string]:string|(()=>string)}, where: string, condv: string){
        const vals = [] as string[];
        let data = [] as string[];
        for (let k in values){
            const val = values[k]
            if(typeof(val) == 'function')
                vals.push(`\`${k}\`=${val()}`)
            else {
                vals.push(`\`${k}\`=?`)
                data.push(val)
            }
        }
        if(where){
            where = ` where ${where}`
            data = data.concat(condv)
        }else where = ''
        const sql_str = `UPDATE \`${table}\` SET ${vals.join(',')}${where}`
        const ret = await(this.query(sql_str, data))
        if(!ret.ok) console.log(ret)
        return ret.ok
    }

}

class Transaction extends DBBase {
    /** @internal */ [K_TRANSACTION_CONN]:MySQL_Driver.PoolConnection

    constructor(conn:MySQL_Driver.PoolConnection){
        super()
        this[K_TRANSACTION_CONN] = conn
    }

    async query(sql_str:string, params:any): Promise<QueryResult>{
        return new Promise((resolve, reject) => {
            this[K_TRANSACTION_CONN].query(sql_str, params, function (err, result) {
                if (err)
                    resolve({ ok: false, result: err })
                else
                    resolve({ ok: true, result: result })
            })
        })
    }

    async commit():Promise<boolean> {
        return new Promise(resolve => {
            this[K_TRANSACTION_CONN].commit(err => {
                if (err){
                    this[K_TRANSACTION_CONN].rollback(()=>{
                        this[K_TRANSACTION_CONN].release()
                        resolve(false)
                    })
                }else{
                    this[K_TRANSACTION_CONN].release()
                    resolve(true)
                }
            })
        })
    }

    async rollback():Promise<boolean> {
        return new Promise(resolve => {
            this[K_TRANSACTION_CONN].rollback(()=>{
                this[K_TRANSACTION_CONN].release()
                resolve(false)
            })
        })
    }
}

declare type DBConfig = MySQL_Driver.PoolConfig

/**
 * class DB
 */
export class DB extends DBBase {
    /** @internal */ pool:MySQL_Driver.Pool
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
    constructor(cfg:DBConfig) {
        super()
        if (!cfg.connectionLimit)
            cfg.connectionLimit = 10
        this.pool = MySQL_Driver.createPool(cfg)
    }

    async connection():Promise<MySQL_Driver.PoolConnection|null> {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err:MySQL_Driver.MysqlError, conn:MySQL_Driver.PoolConnection) => {
                if (err){
                    console.log(err)
                    resolve(null)
                }else
                    resolve(conn)
            });
        });
    }

    async query(sql_str:string, params:any):Promise<QueryResult>{
        const conn = await this.connection()
        if(conn == null) return {ok: false, result: 'NOT_CON'}
        return new Promise((resolve, reject) => {
            conn.query(sql_str, params, function (err, result) {
                conn.release()
                if (err)
                    resolve({ ok: false, result: err })
                else
                    resolve({ ok: true, result: result })
            })
        })
    }

    async begin():Promise<Transaction|null>{
        const conn = await this.connection()
        if (!conn) return null
        return new Promise(resolve => {
            conn.beginTransaction(err => {
                if (err){
                    console.log(err)
                    resolve(null)
                }
                resolve(new Transaction(conn))
            })
        })
    }

    async do(func:(tr:Transaction)=>boolean):Promise<boolean>{
        const trans = await this.begin()
        if(!trans) return false
        if(await func(trans))
            return await trans.commit()
        else{
            await trans.rollback()
            return false
        }
    }
}