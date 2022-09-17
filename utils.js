'use strict'

/*
    工具模块
*/

import { createSign, createVerify, createDecipheriv, createHash, randomUUID } from 'crypto'
import { exec } from 'child_process'

class Utils{
    constructor(){}

    //#region Signature_RSA_SHA256 计算 RSA_SHA256 签名
    Signature_RSA_SHA256(privateKey, data){
        const sign = createSign('RSA-SHA256')
        sign.update(data)
        return sign.sign(privateKey, 'base64')
    }
    //#endregion

    //#region Verify_RSA_SHA256 校验 RSA_SHA256 签名
    Verify_RSA_SHA256(publicKey, data, sign){
        const verify = createVerify('RSA-SHA256')
        verify.update(data)
        return verify.verify(publicKey, sign, 'base64')
    }
    //#endregion

    //#region Decode_AES_256_GCM 解密 AES256GCM 密文
    Decode_AES_256_GCM(key, iv, add, encrypted, mac){
        try{
            if(!mac){
                mac = encrypted.slice(-16)
                encrypted = encrypted.slice(0, -16)
            }
            const decipher = createDecipheriv('AES-256-GCM', key, iv)
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
    //#endregion

    //#region parseJson 带有异常处理的 Json 解析方法
    // 封装了 try catch 的 Json 解析函数
    // 解析成功返回 Json 对象， 失败返回 null
    parseJson(str){
        try{
            return JSON.parse(str)
        }catch(e){
            console.log(e)
            return null
        }
    }
    //#endregion

    //#region sha1
    sha1(v){
        const hash = createHash('sha1')
        return hash.update(v).digest("hex")
    }
    //#endregion

    //#region sha256
    sha256(v){
        const hash = createHash('sha256')
        return hash.update(v).digest("hex")
    }
    //#endregion

    //#region 获取一个新的 UUID （UUID4算法）
    get uuid(){
        return randomUUID()
    }
    //#endregion

    //#region 获取一个新 UUID 的 16 进制字符串（32个字符）
    get uuidHex(){
        const u = this.uuid
        return `${u.substr(0,8)}${u.substr(9,4)}${u.substr(14,4)}${u.substr(19,4)}${u.substr(24)}`
    }
    //#endregion

    //#region 简单脱敏处理（添加星号）
    desens(str, begin, end){
        if(typeof(begin)!='number') begin = 2
        if(typeof(end)!='number') end = 3
        const l = str.length
        return `${str.substr(0,begin)}********${str.substr(l-end)}`
    }
    //#endregion

    //#region 按指定长度生成随机的十六进制字符串
    // 生成随机的十六进制字符串
    //      len = 【可选】字符串长度，默认为 32
    randomHex(len){
        if(!len) len = 32
        let str = this.sha256(this.uuid)
        while(str.length < len) str += this.sha256(this.uuid)
        return str.slice(0, len)
    }
    //#endregion

    //#region 执行 shell 命令，返回详细信息
    //      cmd = 要执行的命令
    //  返回
    //      执行结果 = {
    //          ok : 成功为 true， 失败为 false
    //          data : 命令输出的数据，对应 stdout
    //          err : 命令输出的错误， 对应 stderr
    //      }
    async shellEx(cmd){
        return new Promise(resolve => {
            exec(cmd, (err, stdo, stde) => {
                if(err)
                    resolve({ok: false, data: stdo, err: stde})
                else
                    resolve({ok: true, data: stdo, err: stde})
            })
        })
    }
    //#endregion

    //#region 执行 Shell 命令，返回 stdout 数据
    //      cmd = 要执行的命令
    //  返回
    //      成功返回命令返回的内容，失败返回 null
    async shell(cmd){
        const ret = await this.shellEx(cmd)
        if(ret.ok)
            return ret.data
        return null
    }
    //#endregion

    //#region 当前时间戳（毫秒）
    get now() {
        return Date.now()
    }
    //#endregion

    //#region 当前 Unix 时间戳
    get ts() {
        return Math.floor(Date.now() / 1000)
    }
    //#endregion

    //#region 格式化时间 formatTS(ts, fmt) 或 formatTS(fmt)
    //      ts = 时间戳 | 时间对象 | 时间字符串
    //      fmt = 【可选】格式 'rfc3339' | null
    //  返回
    //      格式化后的时间日期字符串
    formatTS(ts, fmt){
        if(fmt == null && typeof(ts)=='string'){
            fmt = ts
            ts = this.now
        }
        const d = new Date(ts)
        const tz = (d.getTimezoneOffset() / -60)
        if(fmt == 'rfc3339'){
            return d.getFullYear() + '-' + ('00' + (d.getMonth() + 1)).slice(-2) + '-' + ('00' + d.getDate()).slice(-2) + 
            'T' + ('00' + d.getHours()).slice(-2) + ':' + ('00' + d.getMinutes()).slice(-2) + ':' + ('00' + d.getSeconds()).slice(-2) +
            ((tz==0)?'Z':(('00'+tz).slice(-2) + ':00'))
        }
        return d.toString()
    }
    //#endregion

    //#region 识别时间日期字符串
    //      ts_str 要识别的时间日期字符串
    //  返回
    //      ts_str 所指时间的 Unix 时间戳
    parseTS(ts_str){
        const d = new Date(ts_str)
        return parseInt(d.getTime() / 1000)
    }
    //#endregion

}

const utils = new Utils()

export {utils, Utils}