'use strict'

import {randomBytes, randomUUID, createHash, createSign, createVerify, createDecipheriv} from 'crypto'
import {syncObject, timeStampS} from './utils.js'

const DefaultRandomStringDict = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm'


/**
 * 将任何数据转化为字符串，如果输入的是一个对象，会先按键名对其中的所有元素进行排序，而后按照"键值"的形式组合成字符串
 * @param {Any} data 任意数据
 * @returns 字符串选项
 */
export function stringFromAny(data){
    if(typeof data === 'string')
        return data
    else if(typeof data === 'object'){
        const keylst = []
        for(k in data) keylst.push(k)
        const keysorted = keylst.sort()
        str = ''
        for(k of keysorted)
            str += String(k) + String(data[k])
        return str
    }
    data = String(data)
}

/**
 * 计算 sha1
 * @param {string} v 数据
 * @returns sha1 哈希值
 */
export function sha1(v){
    const hash = createHash('sha1')
    return hash.update(v).digest("hex")
}

/**
 * 计算 sha256
 * @param {string} v 数据
 * @returns sha256 哈希值
 */
export function sha256(v){
    const hash = createHash('sha256')
    return hash.update(v).digest("hex")
}

/**
 * 一个新的 UUID （UUID4算法）
 * @returns UUID
 */
export function uuid(){
    return randomUUID()
}

/**
 * 生成一个新 UUID 的 16 进制字符串（32个字符）
 * @returns UUID in HEX
 */
export function uuidHex(){
    const u = this.uuid
    return `${u.substr(0,8)}${u.substr(9,4)}${u.substr(14,4)}${u.substr(19,4)}${u.substr(24)}`
}

/**
 * 生成随机二进制
 * @param {number} length 长度（字节）
 * @returns 随机的字节数组
 */
export function randomBinary(length){
    return randomBytes(length)
}

/**
 * 生成固定长度的随机字符串
 * @param {number} length 长度（字符），默认为 32
 * @param {string} dict 字典
 * @returns 随机字符串
 */
export function randomString(length, dict){
    if(!length) length = 32
    if(!dict) dict=DefaultRandomStringDict
    const buf = randomBytes(length)
    let str = ''
    for(let b of buf)
        str += DefaultRandomStringDict[b % DefaultRandomStringDict.length]
    return str
}

/**
 * 生成固定长度的随机十六进制字符串
 * @param {number} length 长度（字符），默认为 32
 * @returns 随机十六进制字符串
 */
export function randomHex(length){
    if(!length) length = 32
    let str = sha256(uuid)
    while(str.length < length) str += this.sha256(this.uuid)
    return str.slice(0, length)
}


export const signatureMethods = {
    ['sha1']: (str, key) => sha1(str+key),
    ['sha256']: (str, key) => sha256(str+key),
    ['rsa-sha256']: (str, key, m) => createSign('RSA-SHA256').update(str).sign(key, m || 'base64')
}

export const verifyMethods = {
    ['sha1']: (str, key, sign) => (sha1(str+key) == sign),
    ['sha256']: (str, key, sign) => (sha256(str+key) == sign),
    ['rsa-sha256']: (str, key, sign, m) => createVerify('RSA-SHA256').update(str).verify(key, sign, m || 'base64')
}

/**
 * 生成签名数据
 * @param {Any} data 数据
 * @param {string} key 密钥
 * @param {object} options 选项
 * @returns {nonce: string, ts: number, sign: string}
 */
 export function MakeSignature(data, key, options){
    const opts = { method: 'sha1', nonceLength: 32, nonceDict: DefaultRandomStringDict }
    syncObject(opts, options)
    const nonce = randomString(opts.nonceLength, opts.nonceDict)
    const ts = timeStampS()
    if(opts.method in signatureMethods)
        return {
            nonce: nonce,
            ts: ts,
            sign: signatureMethods[opts.method](`${stringFromAny(data)}${nonce}${ts}`, key)
        }
    return null
}

/**
 * 验证签名数据, options.maxDeltaT < 0 时不作时间戳检查
 * @param {Any} data 数据
 * @param {string} key 密钥
 * @param {object} sign 签名数据
 * @param {object} options 选项
 * @returns 验证通过返回 true，否则返回 false
 */
export function VerifySignature(data, key, sign, options){
    const opts = { method: 'sha1', maxDeltaT:60 }
    syncObject(opts, options)
    const dt = timeStampS() - sign.ts
    if(opts.maxDeltaT > 0 && (dt > opts.maxDeltaT || dt < -opts.maxDeltaT)) return false
    if(opts.method in verifyMethods)
        return verifyMethods[opts.method](`${stringFromAny(data)}${sign.nonce}${sign.ts}`, key, sign.sign)
    return false
}

/**
 * 解密 AES256GCM 密文
 * @param {string} key 密钥
 * @param {string} iv IV
 * @param {string} add ADD
 * @param {string} encrypted 密文
 * @param {string} mac MAC
 * @returns 明文
 */
export function Decode_AES_256_GCM(key, iv, add, encrypted, mac){
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