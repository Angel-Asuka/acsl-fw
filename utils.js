'use strict'

/*
    工具模块
*/

const fs = require('fs')
const uuid = require('uuid')
const crypto = require('crypto')
const cp = require('child_process')

module.exports = (__l)=>{return new class {
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

    sha1(v){
        const hash = crypto.createHash('sha1')
        return hash.update(v).digest("hex")
    }

    sha256(v){
        const hash = crypto.createHash('sha256')
        return hash.update(v).digest("hex")
    }

    get uuid(){
        return uuid.v4()
    }

    get uuid1(){
        return uuid.v1()
    }

    get uuid2(){
        return uuid.v2()
    }

    get uuid3(){
        return uuid.v3()
    }

    get uuid4(){
        return uuid.v4()
    }

    get uuidHex(){
        const u = uuid.v4()
        return `${u.substr(0,8)}${u.substr(9,4)}${u.substr(14,4)}${u.substr(19,4)}${u.substr(24)}`
    }

    desens(str, begin, end){
        if(typeof(begin)!='number') begin = 2
        if(typeof(end)!='number') end = 3
        const l = str.length
        return `${str.substr(0,begin)}********${str.substr(l-end)}`
    }

    // 生成随机的十六进制字符串
    //      len = 【可选】字符串长度，默认为 32
    randomHex(len){
        if(!len) len = 32
        let str = this.sha256(uuid.v4())
        while(str.length < len) str += this.sha256(uuid.v4())
        return str.slice(0, len)
    }

    // 执行 shell 命令
    //      cmd = 要执行的命令
    //  返回
    //      执行结果 = {
    //          ok : 成功为 true， 失败为 false
    //          data : 命令输出的数据，对应 stdout
    //          err : 命令输出的错误， 对应 stderr
    //      }
    async shellEx(cmd){
        return new Promise(resolve => {
            cp.exec(cmd, (err, stdo, stde) => {
                if(err)
                    resolve({ok: false, data: stdo, err: stde})
                else
                    resolve({ok: true, data: stdo, err: stde})
            })
        })
    }

    // 执行 Shell 命令
    //      cmd = 要执行的命令
    //  返回
    //      成功返回命令返回的内容，失败返回 null
    async shell(cmd){
        const ret = await this.shellEx(cmd)
        if(ret.ok)
            return ret.data
        return null
    }

    // 当前时间戳（毫秒）
    get now() {
        return Date.now()
    }

    // 当前 Unix 时间戳
    get ts() {
        return Math.floor(Date.now() / 1000)
    }

    // 格式化时间
    //      ts = 时间戳 | 时间对象 | 时间字符串
    //      fmt = 【可选】格式 'rfc3339' | null
    //  返回
    //      格式化后的时间日期字符串
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

    // 识别时间日期字符串
    //      ts_str 要是别的时间日期字符串
    //  返回
    //      ts_str 所指时间的 Unix 时间戳
    parseTS(ts_str){
        const d = new Date(ts_str)
        return parseInt(d.getTime() / 1000)
    }

    // 打开文件
    //      fn = 文件路径
    //      flags = 【可选】打开方式，默认 r
    //      mode = 【可选】文件权限， 默认 0o666
    //  返回
    //      成功返回文件描述符fd， 失败返回 null
    async fopen(fn, flags, mode){
        return new Promise((resolve)=>{
            fs.open(fn, flags, mode, (err, fd)=>{
                if(err){
                    console.log(err)
                    resolve(null)
                }else
                    resolve(fd)
            })
        })
    }

    // 写文件
    //      fd = 文件描述符
    //      buffer = 数据缓冲区
    //      offset = 【可选】要写入的数据在数据缓冲区中的偏移（字节）
    //      length = 【可选】小写入的数据长度（字节）
    //      position = 【可选】写入位置，默认为当前位置
    //  返回
    //      成功返回 null，失败返回错误对象
    async fwrite(fd, buffer, offset, length, position){
        return new Promise((resolve)=>{
            fs.write(fd, buffer, offset, length, position, (err, bytesWritten, buffer)=>{
                resolve(err)
            })
        })
    }

    // 关闭文件描述符
    //      fd = 要关闭的文件描述符
    async fclose(fd){
        return new Promise((resolve)=>{fs.close(fd, resolve)})
    }

    // 将数据写入文件
    //      file = <string> | <Buffer> | <URL> | <integer> 文件名或文件描述符
    //      data = <string> | <Buffer> | <TypedArray> | <DataView> | <Object> 要写入的数据
    //      options = 【可选】 {
    //          encoding : 字符编码，默认为 'utf8'
    //          mode : 文件权限，默认为 0o666
    //          flag : 打开文件的标志，默认为 w
    //          signal : <AbortSignal> 终止信号
    //      }
    //  返回
    //      成功返回 null， 失败返回错误对象
    async fwriteFile(file, data, options){
        return new Promise((resolve)=>{fs.writeFile(file, data, options, (err)=>{resolve(err)})})
    }

    // 创建目录
    //      path = 目录路径
    //      options = 【可选】{
    //          recursive = 是否递归创建父目录，默认为 false
    //          mode = 权限，默认 0o777
    //      }
    //  返回
    //      成功返回 null， 失败返回错误对象
    async mkdir(path, options){
        return new Promise((resolve)=>{fs.mkdir(path, options, (err)=>{resolve(err)})})
    }

    // 同步创建目录
    //      path = 目录路径
    //      options = 【可选】{
    //          recursive = 是否递归创建父目录，默认为 false
    //          mode = 权限，默认 0o777
    //      }
    //  返回
    //      成功返回 null， 失败返回错误对象
    async mkdirSync(path, options){
        try{
            fs.mkdirSync(path, options)
        }catch(err){
            return err
        }
    }
}}