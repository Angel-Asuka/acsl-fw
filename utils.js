'use strict'

/*
    工具模块
*/

const uuid = require('uuid')
const crypto = require('crypto')
const cp = require('child_process')

module.exports = (__l)=>{return class {
    constructor(cfg) {
        this.Langley = __l
    }

    RSASHA256(privateKey, data, encoding){
        if(!encoding) encoding = 'utf-8'
        const sign = crypto.createSign('RSA-SHA256')
        sign.update(new Buffer.from(data, encoding))
        return sign.sign(privateKey, 'base64')
    }

    randomHex(len){
        if(!len) len = 32
        const hash = crypto.createHash('sha256')
        let str = hash.update(uuid.v4()).digest("hex")
        while(str.length < len) str += hash.update(uuid.v4()).digest("hex")
        return str.slice(len)
    }

    async shellEx(cmd){
        return new Promise(resolve => {
            cp.exec(cmd, (err, stdo, stde) => {
                if(err)
                    resolve({ok: false, err: stde})
                else
                    resolve({ok: true, data: stdo})
            })
        })
    }

    async shell(cmd){
        const ret = await this.shellEx(cmd)
        if(ret.ok)
            return ret.data
        return null
    }

    get now() {
        return Date.now()
    }

    get ts() {
        return Math.floor(Date.now() / 1000)
    }

    formatTS(ts, fmt){
        const d = new Date(ts)
        const tz = (d.getTimezoneOffset() / -60)
        if(fmt == 'rfc3339'){
            return d.getFullYear() + '-' + ('00' + (d.getMonth() + 1)).slice(-2) + '-' + ('00' + d.getDate()).slice(-2) + 
            'T' + ('00' + d.getHours()).slice(-2) + ':' + ('00' + d.getMinutes()).slice(-2) + ':' + ('00' + d.getSeconds()).slice(-2) +
            ((tz==0)?'Z':(('00'+tz).slice(-2) + ':00'))
        }
        return d.toString()
    }

    

}}