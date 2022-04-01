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

    Signature_RSA_SHA256(privateKey, data){
        const sign = crypto.createSign('RSA-SHA256')
        sign.update(data)
        return sign.sign(privateKey, 'base64')
    }

    Verify_RSA_SHA256(publicKey, data, sign){
        const verify = crypto.createVerify('RSA-SHA256')
        verify.update(data)
        return verify.verify(publicKey, sign, 'base64')
    }

    Decode_AES_256_GCM(key, iv, add, encrypted, mac){
        try{
            if(!mac){
                mac = encrypted.slice(-16)
                encrypted = encrypted.slice(0, -16)
            }
            const decipher = crypto.createDecipheriv('AES-256-GCM', key, iv)
            decipher.setAuthTag(mac)
            decipher.setAAD(Buffer.from(add))
            return Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ])
        }catch(e){
            console.log(e)
            return null
        }
    }

    parseJson(str){
        try{
            return JSON.parse(str)
        }catch(e){
            console.log(e)
            return null
        }
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

    parseTS(ts_str){
        const d = new Date(ts_str)
        return Math.floor(d.getTime() / 1000)
    }
    

}}