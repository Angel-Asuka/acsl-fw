type SignatureMethod = 'sha1' | 'sha256' | 'rsa-sha256'

/**
 * 将任何数据转化为字符串，如果输入的是一个对象，会先按键名对其中的所有元素进行排序，而后按照"键值"的形式组合成字符串
 * @param {Any} data 任意数据
 * @returns 字符串选项
 */
export function stringFromAny(data: any):void

/**
 * 计算 sha1
 * @param {string} v 数据
 * @returns sha1 哈希值
 */
export function sha1(v:any):string

/**
 * 计算 sha256
 * @param {string} v 数据
 * @returns sha256 哈希值
 */
export function sha256(v:any):string

/**
 * 一个新的 UUID （UUID4算法）
 * @returns UUID
 */
export function uuid():string

/**
 * 生成一个新 UUID 的 16 进制字符串（32个字符）
 * @returns UUID in HEX
 */
export function uuidHex():string

/**
 * 生成随机二进制
 * @param {number} length 长度（字节）
 * @returns 随机的字节数组
 */
export function randomBinary(length:number):Array<number>

/**
 * 生成固定长度的随机字符串
 * @param {number} length 长度（字符），默认为 32
 * @param {string} dict 字典
 * @returns 随机字符串
 */
export function randomString(length:number, dict:string):string

/**
 * 生成固定长度的随机十六进制字符串
 * @param {number} length 长度（字符），默认为 32
 * @returns 随机十六进制字符串
 */
export function randomHex(length:number):string

/**
 * 生成签名数据
 * @param {Any} data 数据
 * @param {string} key 密钥
 * @param {object} options 选项
 * @returns {nonce: string, ts: number, sign: string}
 */
export function MakeSignature(data:any, key:string, options?:{method?:SignatureMethod, nonceLength?:number, nonceDict?: string}):{nonce: string,ts: number,sign: string, [k:string]:any}|null

/**
 * 验证签名数据
 * @param {Any} data 数据
 * @param {string} key 密钥
 * @param {object} sign 签名数据
 * @param {object} options 选项
 * @returns 验证通过返回 true，否则返回 false
 */
export function VerifySignature(data:any, key:string, sign:{nonce:string,ts:number,sign:string}, options?:{method?:SignatureMethod, maxDeltaT?: number}):boolean
