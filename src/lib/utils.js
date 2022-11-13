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
    if(typeof obj == 'object' && typeof ref == 'object')
    for(let k in obj) if(k in ref) obj[k] = ref[k]
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


const K_TIMEWHEEL_WHEEL = Symbol()
const K_TIMEWHEEL_POINTER = Symbol()
const K_TIMEWHEEL_UNIT = Symbol()
const K_TIMEWHEEL_CB = Symbol()
const K_TIMEWHEEL_ID = Symbol()
const K_TIMEWHEEL_PROC = Symbol()
const K_TIMEWHEEL_UDATA = Symbol()

const K_TIMEWHEEL_WRAPPER_BID = Symbol()
const K_TIMEWHEEL_WRAPPER_AID = Symbol()
const K_TIMEWHEEL_WRAPPER_OBJ = Symbol()

/**
 * 时间轮
 */
export class TimeWheel{
    /**
     * 构造一个时间轮
     * @param {number} unit 单位事件长度（毫秒）
     * @param {number} size 时间轮长度
     * @param {function} cb 回调函数
     * @param {any} udata 用户数据
     * @example
     * 下面的代码中：
     *      idx = 对象在时间轮中的ID
     *      obj = 对象
     *      wheel = 时间轮对象，等同于 tw
     * 
     * const tw = new TimeWheel(2000,30,(idx, obj, wheel)=>{
     *      ...
     * },null)
     */
    constructor(unit, size, cb, udata){
        this[K_TIMEWHEEL_WHEEL] = []
        this[K_TIMEWHEEL_POINTER] = 0
        this[K_TIMEWHEEL_UNIT] = unit
        this[K_TIMEWHEEL_CB] = cb
        this[K_TIMEWHEEL_ID] = null
        this[K_TIMEWHEEL_UDATA] = udata
        for(let i=0; i<size; ++i) this[K_TIMEWHEEL_WHEEL].push([])
    }

    /**
     * 启动时间轮
     */
    start(){
        this.stop()
        this[K_TIMEWHEEL_ID] = setInterval(this[K_TIMEWHEEL_PROC].bind(this), this[K_TIMEWHEEL_UNIT])
    }

    /**
     * 停止时间轮
     */
    stop(){
        if(this[K_TIMEWHEEL_ID] != null){
            clearInterval(this[K_TIMEWHEEL_ID])
            this[K_TIMEWHEEL_ID] = null
        }
    }

    /**
     * 将对象插入时间轮
     * @param {any} obj 对象
     * @param {number} toffset 时间偏移，默认为 -1
     * @returns 对象在时间轮中的ID
     */
    join(obj, toffset){
        if(toffset == null) toffset = -1
        const bid = (this[K_TIMEWHEEL_POINTER] + this[K_TIMEWHEEL_WHEEL].length + toffset) % this[K_TIMEWHEEL_WHEEL].length
        const aid = this[K_TIMEWHEEL_WHEEL][bid].length
        const o = {
            [K_TIMEWHEEL_WRAPPER_BID]: bid,
            [K_TIMEWHEEL_WRAPPER_AID]: aid,
            [K_TIMEWHEEL_WRAPPER_OBJ]: obj
        }
        this[K_TIMEWHEEL_WHEEL][bid][aid] = o
        return o
    }
    
    /**
     * 从时间轮中删除一个对象
     * @param {object} o 对象在时间轮中的ID
     */
    remove(o){
        const bid = o[K_TIMEWHEEL_WRAPPER_BID]
        const aid = o[K_TIMEWHEEL_WRAPPER_AID]
        if(bid >= 0 && aid >= 0 && this[K_TIMEWHEEL_WHEEL][bid].length > 0){
            if(this[K_TIMEWHEEL_WHEEL][bid].length > aid + 1){
                this[K_TIMEWHEEL_WHEEL][bid][aid] = this[K_TIMEWHEEL_WHEEL][bid][this[K_TIMEWHEEL_WHEEL][bid].length - 1]
                this[K_TIMEWHEEL_WHEEL][bid][aid][K_TIMEWHEEL_WRAPPER_AID] = aid
            }
            this[K_TIMEWHEEL_WHEEL][bid].length--
        }
        o[K_TIMEWHEEL_WRAPPER_BID] = o[K_TIMEWHEEL_WRAPPER_AID] = -1
    }

    /**
     * 用户数据
     */
    get data(){ return this[K_TIMEWHEEL_UDATA] }

    /**
     * 用户数据
     */
    set data(d){ return this[K_TIMEWHEEL_UDATA] = d }

    [K_TIMEWHEEL_PROC](){
        const objs = Array.from(this[K_TIMEWHEEL_WHEEL][this[K_TIMEWHEEL_POINTER]])
        for(let i=objs.length-1; i>=0; --i){
            this[K_TIMEWHEEL_CB](objs[i], objs[i][K_TIMEWHEEL_WRAPPER_OBJ], this);
        }
        this[K_TIMEWHEEL_POINTER] = (this[K_TIMEWHEEL_POINTER] + 1) % this[K_TIMEWHEEL_WHEEL].length
    }
}