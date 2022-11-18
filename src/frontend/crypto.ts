import {timeStampS} from './utils.js'
import {stringFromAny, generateString} from '../common/crypto.js'

const __text_encoder = new TextEncoder()
const __text_decoder = new TextDecoder()

export function ArrayBufferToHexString(ab:ArrayBuffer):string{
    return [...new Uint8Array(ab)].map(x=>x.toString(16).padStart(2,'0')).join('')
}

export async function hash(algorithm:string, data:any):Promise<ArrayBuffer|null>{
    if(typeof data === 'string')
        return await crypto.subtle.digest(algorithm, __text_encoder.encode(data).buffer)
    else if(typeof data === 'object'){
        if(data.constructor == ArrayBuffer)
            return await crypto.subtle.digest(algorithm, data)
        else if(data.constructor == Blob)
            return await crypto.subtle.digest(algorithm, await data.arrayBuffer())
        else if('buffer' in data && data.buffer.constructor == ArrayBuffer)
            return await crypto.subtle.digest(algorithm, data.buffer)
    }
    return null
}

export async function hexHash(algorithm:string, data:any):Promise<string>{
    const b = await hash(algorithm, data)
    if(b) return ArrayBufferToHexString(b)
    return ''
}

/**
 * 计算 sha1
 * @param {string} v 数据
 * @returns sha1 哈希值
 */
export async function sha1(v:any){
    return hexHash('SHA-1', v)
}

/**
 * 计算 sha256
 * @param {string} v 数据
 * @returns sha256 哈希值
 */
 export async function sha256(v:any){
    return hexHash('SHA-256', v)
}

/**
 * 一个新的 UUID （UUID4算法）
 * @returns UUID
 */
 export function uuid(){
    return crypto.randomUUID()
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
    const buf = new Uint32Array(Math.floor(length / 4 + 1))
    crypto.getRandomValues(buf)
    return buf.buffer.slice(0, length)
}

/**
 * 生成固定长度的随机字符串
 * @param {number} length 长度（字符），默认为 32
 * @param {string} dict 字典
 * @returns 随机字符串
 */
 export function randomString(length:number, dict:string){
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

type SignatureMethod = 'sha1' | 'sha256'

type SignatureFunction = (str:string, key:string)=>Promise<string>
type VerifyFunction = (str:string, key:string, sign:string)=>Promise<boolean>

const signatureMethods : {[ket:string]:SignatureFunction} = {
    ['sha1']: (str:string, key:string) => sha1(str+key),
    ['sha256']: (str:string, key:string) => sha256(str+key)
}

const verifyMethods : {[ket:string]:VerifyFunction} = {
    ['sha1']: async (str:string, key:string, sign:string) => ((await sha1(str+key)) == sign),
    ['sha256']: async (str:string, key:string, sign:string) => ((await sha256(str+key)) == sign)
}

/**
 * 生成签名数据
 * @param {Any} data 数据
 * @param {string} key 密钥
 * @param {object} options 选项
 * @returns {nonce: string, ts: number, sign: string}
 */
export async function MakeSignature(data:any, key:string, 
    {method = 'sha1', nonceLength = 32, nonceDict = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm' }:
    {method?:SignatureMethod, nonceLength?:number, nonceDict?: string}={}):Promise<{nonce: string,ts: number,sign: string, [k:string]:any}|null>{
    const nonce = randomString(nonceLength, nonceDict)
    const ts = timeStampS()
    if(method in signatureMethods)
        return {
            nonce: nonce,
            ts: ts,
            sign: await signatureMethods[method](`${stringFromAny(data)}${nonce}${ts}`, key)
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
export async function VerifySignature(data:any, key:string, sign:{nonce:string,ts:number,sign:string}, 
    { method = 'sha1', maxDeltaT = 60 }:{method?:SignatureMethod, maxDeltaT?: number}={}):Promise<boolean>{
    const dt = timeStampS() - sign.ts
    if(maxDeltaT > 0 && (dt > maxDeltaT || dt < -maxDeltaT)) return false
    if(method in verifyMethods)
        return await verifyMethods[method](`${stringFromAny(data)}${sign.nonce}${sign.ts}`, key, sign.sign)
    return false
}