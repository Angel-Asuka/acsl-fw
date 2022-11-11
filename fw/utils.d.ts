
/**
 * 将同时存在于两个对象中的键所对应的值从参考对象复制到要同步的对象中
 * @param {object} obj 要同步的对象
 * @param {object} ref 参考对象
 */
export function syncObject(obj:object, ref:object):void

/**
 * 获取当前 Unix 时间戳（毫秒）
 * @returns 当前 Unix 时间戳（毫秒）
 */
export function timeStampMS():number

/**
 * 获取当前 Unix 时间戳（秒）
 * @returns 当前 Unix 时间戳（秒）
 */
export function timeStampS():number

/**
 * 带有异常处理的 Json 解析方法
 * @param str JSON字符串
 * @returns 解析成功返回 Json 对象， 失败返回 null
 */
export function parseJson(str:string):object|null

/**
 * 简单脱敏处理（添加星号）
 */
export function desens(str:string, begin:number, end:number):string

/**
 * 执行 shell 命令，返回详细信
 * @param cmd 要执行的命令
 */
export function shellEx(cmd:string):Promise<{ok:boolean, data:string, err:string}>

/**
 * 执行 Shell 命令，返回 stdout 数据
 * @param cmd 要执行的命令
 */
export function shell(cmd:string):Promise<string|null>

declare type TimeFormat = 'rfc3339'|null

/**
 * 格式化时间
 * @param ts 时间戳 | 时间对象 | 时间字符串
 * @param fmt 格式
 * @returns 格式化后的时间日期字符串
 */
export function formatTS(ts:any, fmt:TimeFormat):string

/**
 * 识别时间日期字符串
 * @param ts 要识别的时间日期字符串
 * @returns 识别出来的 Unix 时间戳
 */
export function parseTS(ts:string):number