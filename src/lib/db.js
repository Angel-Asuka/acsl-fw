/**
 * MySQL 数据库模块
 */

import * as MySQL_Driver from 'mysql'

const K_TRANSACTION_CONN = Symbol()

class DBBase {
    constructor(){}
    
    CURRENT_TIMESTAMP(){ return 'CURRENT_TIMESTAMP' }

    async fetch(sql, param){
        const ret = await this.query(sql, param)
        if(ret.ok) return ret.result
        console.log(ret)
        return null
    }

    async fetchone(sql, param){
        const ret = await this.query(sql, param)
        if(ret.ok && ret.result.length) return ret.result[0]
        if(!ret.ok) console.log(ret)
        return null
    }

    async exec(sql, param){
        const ret = await this.query(sql, param)
        if(!ret.ok) console.log(ret)
        return ret.ok
    }

    async insert(table, values){
        const keys = [];
        const vals = [];
        const data = [];
        for (let k in values){
            keys.push(k);
            if(typeof(values[k]) == 'function')
                vals.push(values[k]())
            else {
                vals.push('?')
                data.push(values[k])
            }
        }
        const sql_str = `INSERT INTO \`${table}\` (\`${keys.join('`,`')}\`)VALUES(${vals.join(',')})`
        const ret = await(this.query(sql_str, data))
        if (ret.ok) return ret.result.insertId
        console.log(ret)
        return null
    }

    async update(table, values, where, condv){
        const vals = [];
        let data = [];
        for (let k in values){
            if(typeof(values[k]) == 'function')
                vals.push(`\`${k}\`=${values[k]()}`)
            else {
                vals.push(`\`${k}\`=?`)
                data.push(values[k])
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
    constructor(conn){
        super()
        this[K_TRANSACTION_CONN] = conn
    }

    async query(sql_str, params){
        return new Promise((resolve, reject) => {
            this[K_TRANSACTION_CONN].query(sql_str, params, function (err, result) {
                if (err)
                    resolve({ ok: false, result: err })
                else
                    resolve({ ok: true, result: result })
            })
        })
    }


    async commit(){
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

    async rollback(){
        return new Promise(resolve => {
            this[K_TRANSACTION_CONN].rollback(()=>{
                this[K_TRANSACTION_CONN].release()
                resolve(false)
            })
        })
    }
}

/**
 * class DB
 */
class DB extends DBBase {
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
    constructor(cfg) {
        super()
        if (!cfg.connectionLimit)
            cfg.connectionLimit = 10
        this.pool = MySQL_Driver.createPool(cfg)
    }

    async connection() {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, conn) => {
                if (err){
                    console.log(err)
                    resolve(null)
                }else
                    resolve(conn)
            });
        });
    }

    async query(sql_str, params){
        const conn = await this.connection()
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

    async begin(){
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

    async do(func){
        const trans = await this.begin()
        if(await func(trans))
            return await trans.commit()
        else{
            await trans.rollback()
            return false
        }
    }
}

export {DB}