'use strict'

/*
    数据库模块
    cfg = {
        host: ,
        user: ,
        password: ,
        port: ,
        database: 
    }
*/

const MySQL_Driver = require('mysql');

const K_TRANSACTION_CONN = Symbol()

class Transaction {
    constructor(conn){
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

    CURRENT_TIMESTAMP(){ return 'CURRENT_TIMESTAMP' }

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
        console.log(sql_str)
        const ret = await(this.query(sql_str, data))
        if (ret) return ret.result.insertId
        return null
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

module.exports = (__l)=>{return class {
    constructor(cfg) {
        this.Langley = __l;
        if (!cfg.connectionLimit)
            cfg.connectionLimit = 10;
        this.pool = MySQL_Driver.createPool(cfg);
    }

    async connection() {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, conn) => {
                if (err)
                    resolve(null);
                else
                    resolve(conn);
            });
        });
    }

    async query(sql_str, params){
        const conn = await this.connection()
        return new Promise((resolve, reject) => {
            conn.query(sql_str, params, function (err, result) {
                this[K_TRANSACTION_CONN].release()
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
                if (err) resolve(null)
                resolve(new Transaction(conn))
            })
        })
    }

    async do(func){
        const trans = await this.begin()
        if(await func(trans))
            return await trans.commit()
        else
            return await trans.rollback()
    }
}}