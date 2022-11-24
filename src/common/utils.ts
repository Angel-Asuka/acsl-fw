export * from './wish.js'

/**
 * 将同时存在于两个对象中的键所对应的值从参考对象复制到要同步的对象中
 * @param obj 要同步的对象
 * @param ref 参考对象
 */
 export function syncObject(obj:any, ref:any){
    if(typeof obj == 'object' && typeof ref == 'object')
    for(let k in obj){
        if(k in ref){
            if(typeof obj[k] == 'object' && obj[k] != null)
                syncObject(obj[k], ref[k])
            else
                obj[k] = ref[k]
        }
    }
}

/**
 * 获取当前 Unix 时间戳（毫秒）
 * @returns 当前 Unix 时间戳（毫秒）
 */
export function timeStampMS():number {
    return Date.now()
}

/**
 * 获取当前 Unix 时间戳（秒）
 * @returns 当前 Unix 时间戳（秒）
 */
export function timeStampS():number {
    return Math.floor(Date.now() / 1000)
}

/**
 * 带有异常处理的 Json 解析方法
 * @param str JSON字符串
 * @returns 解析成功返回 Json 对象， 失败返回 null
 */
export function parseJson(str:string):any{
    try{
        return JSON.parse(str)
    }catch(e){
        console.log(e)
        return null
    }
}

/**
 * 简单脱敏处理（添加星号）
 */
 export function desens(str:string, begin:number, end:number):string{
    if(typeof(begin)!='number') begin = 2
    if(typeof(end)!='number') end = 3
    const l = str.length
    return `${str.substring(0,begin)}********${str.substring(l-end)}`
}


declare type TimeFormat = 'rfc3339'|null

/**
 * 格式化时间
 * @param ts 时间戳 | 时间对象 | 时间字符串
 * @param fmt 格式
 * @returns 格式化后的时间日期字符串
 */
 export function formatTS(ts:any, fmt:TimeFormat):string{
    if(fmt == null && typeof(ts)=='string'){
        fmt = ts as TimeFormat
        ts = Date.now()
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

/**
 * 识别时间日期字符串
 * @param ts 要识别的时间日期字符串
 * @returns 识别出来的 Unix 时间戳
 */
export function parseTS(ts:string):number{
    const d = new Date(ts)
    return Math.floor(d.getTime() / 1000)
}

export async function asleep(ms:number):Promise<void> {
    return new Promise(r=>setTimeout(r, ms))
}