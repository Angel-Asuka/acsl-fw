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
        return new Promise((resolve, reject) => {
            this.connection().then((conn)=>{
                conn.query(sql_str, params, function (err, result) {
                    conn.end()
                    if (err)
                        resolve({ ok: false, result: err })
                    else
                        resolve({ ok: true, result: result })
                });
            }).catch(()=>{
                resolve({ok:false, result: 'CON_FAILED!'})
            })
        })
    }
}}