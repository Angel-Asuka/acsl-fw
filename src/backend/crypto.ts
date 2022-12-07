import {randomBytes, randomUUID, createHash, createSign, createVerify, createDecipheriv, createCipheriv} from 'crypto'
import {timeStampS} from './utils.js'
import {stringFromAny, generateString} from '../common/crypto.js'

/**
 * 计算 sha1
 * @param {string} v 数据
 * @returns sha1 哈希值
 */
export function sha1(v:any){
    const hash = createHash('sha1')
    return hash.update(v).digest("hex")
}

/**
 * 计算 sha256
 * @param {string} v 数据
 * @returns sha256 哈希值
 */
export function sha256(v:any){
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
    const u = uuid()
    return `${u.substring(0,8)}${u.substring(9,13)}${u.substring(14,18)}${u.substring(19,23)}${u.substring(24)}`
}

/**
 * 生成随机二进制
 * @param {number} length 长度（字节）
 * @returns 随机的字节数组
 */
export function randomBinary(length:number){
    return randomBytes(length)
}

/**
 * 生成固定长度的随机字符串
 * @param {number} length 长度（字符），默认为 32
 * @param {string} dict 字典
 * @returns 随机字符串
 */
export function randomString(length:number, dict?:string){
    if(!length) length = 32
    return generateString(randomBinary(length), dict)
}

/**
 * 生成固定长度的随机十六进制字符串
 * @param {number} length 长度（字符），默认为 32
 * @returns 随机十六进制字符串
 */
export function randomHex(length:number){
    if(!length) length = 32
    return randomString(length, "0123456789abcdef")
}

type SignatureMethod = 'sha1' | 'sha256' | 'rsa-sha256'

const signatureMethods : {[ket:string]:(str:string, key:string)=>string} = {
    ['sha1']: (str:string, key:string) => sha1(str+key),
    ['sha256']: (str:string, key:string) => sha256(str+key),
    ['rsa-sha256']: (str:string, key:string, m?:'base64' | 'base64url' | 'hex' | 'binary') => createSign('RSA-SHA256').update(str).sign(key, m || 'base64')
}

const verifyMethods : {[ket:string]:(str:string, key:string, sign:string)=>boolean} = {
    ['sha1']: (str:string, key:string, sign:string) => (sha1(str+key) == sign),
    ['sha256']: (str:string, key:string, sign:string) => (sha256(str+key) == sign),
    ['rsa-sha256']: (str:string, key:string, sign:string, m?:'base64' | 'base64url' | 'hex' | 'binary') => createVerify('RSA-SHA256').update(str).verify(key, sign, m || 'base64')
}

/**
 * 生成签名数据
 * @param {Any} data 数据
 * @param {string} key 密钥
 * @param {object} options 选项
 * @returns {nonce: string, ts: number, sign: string}
 */
export function MakeSignature(data:any, key:string, 
    {method = 'sha1', nonceLength = 32, nonceDict = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm' }:
    {method?:SignatureMethod, nonceLength?:number, nonceDict?: string}={}):{nonce: string,ts: number,sign: string, [k:string]:any}|null{
    const nonce = randomString(nonceLength, nonceDict)
    const ts = timeStampS()
    if(method in signatureMethods)
        return {
            nonce: nonce,
            ts: ts,
            sign: signatureMethods[method](`${stringFromAny(data)}${nonce}${ts}`, key)
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
 export function VerifySignature(data:any, key:string, sign:{nonce:string,ts:number,sign:string}, 
    { method = 'sha1', maxDeltaT = 60 }:{method?:SignatureMethod, maxDeltaT?: number}={}):boolean{
    const dt = timeStampS() - sign.ts
    if(maxDeltaT > 0 && (dt > maxDeltaT || dt < -maxDeltaT)) return false
    if(method in verifyMethods)
        return verifyMethods[method](`${stringFromAny(data)}${sign.nonce}${sign.ts}`, key, sign.sign)
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
export function Decode_AES_256_GCM(key:string, iv:string, add:string, encrypted:string, mac:string){
    try{
        if(!mac){
            mac = encrypted.slice(-16)
            encrypted = encrypted.slice(0, -16)
        }
        const decipher = createDecipheriv('AES-256-GCM', key, iv) as any
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

/**
 * 加密 AES256GCM 明文
 * @param {string} key 密钥
 * @param {string} iv IV
 * @param {string} add ADD
 * @param {string} plain 明文
 * @returns {encrypted: string, mac: string}
 */
export function Encode_AES_256_GCM(key:string, iv:string, add:string, plain:string){
    try{
        const cipher = createCipheriv('AES-256-GCM', key, iv) as any
        cipher.setAAD(Buffer.from(add))
        const encrypted = Buffer.concat([
            cipher.update(plain),
            cipher.final()
        ])
        return {
            encrypted: encrypted.toString('base64'),
            mac: cipher.getAuthTag().toString('base64')
        }
    }catch(e){
        console.log(e)
        return null
    }
}