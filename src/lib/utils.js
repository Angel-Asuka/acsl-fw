'use strict'

/*
    工具模块
*/

import { exec } from 'child_process'

/**
 * 将同时存在于两个对象中的键所对应的值从参考对象复制到要同步的对象中
 * @param {object} obj 要同步的对象
 * @param {object} ref 参考对象
 */
export function syncObject(obj, ref){
    if(typeof obj === typeof ref === 'object')
    for(k in obj) if(k in ref) obj[k] = ref[k]
}

/**
 * 获取当前 Unix 时间戳（毫秒）
 * @returns 当前 Unix 时间戳（毫秒）
 */
export function timeStampMS() {
    return Date.now()
}

/**
 * 获取当前 Unix 时间戳（秒）
 * @returns 当前 Unix 时间戳（秒）
 */
export function timeStampS() {
    return parseInt(Date.now() / 1000)
}

//#region parseJson 带有异常处理的 Json 解析方法
// 封装了 try catch 的 Json 解析函数
// 解析成功返回 Json 对象， 失败返回 null
export function parseJson(str){
    try{
        return JSON.parse(str)
    }catch(e){
        console.log(e)
        return null
    }
}
//#endregion

//#region 简单脱敏处理（添加星号）
export function desens(str, begin, end){
    if(typeof(begin)!='number') begin = 2
    if(typeof(end)!='number') end = 3
    const l = str.length
    return `${str.substr(0,begin)}********${str.substr(l-end)}`
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
export async function shellEx(cmd){
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
export async function shell(cmd){
    const ret = await this.shellEx(cmd)
    if(ret.ok)
        return ret.data
    return null
}
//#endregion



//#region 格式化时间 formatTS(ts, fmt) 或 formatTS(fmt)
//      ts = 时间戳 | 时间对象 | 时间字符串
//      fmt = 【可选】格式 'rfc3339' | null
//  返回
//      格式化后的时间日期字符串
export function formatTS(ts, fmt){
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
export function parseTS(ts_str){
    const d = new Date(ts_str)
    return parseInt(d.getTime() / 1000)
}
//#endregion