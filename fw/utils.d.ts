
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
export function parseJson(str:string):any

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

/**
 * 解析命令行参数
 * @param {object} keys 带值参数表
 * @param {object} options 选项参数表
 * @param {Array} argv 命令行 
 * @param {function} onerr 错误处理函数
 * @example
 *  It's never been a bad choice to setting up onerr like this: 
 *   (k)=>{
 *       if(t in options)
 *           console.log(`Uncomplete option ${prev}`)
 *       else
 *           console.log(`Unknown option ${prev}`)
 *       process.exit()
 *   }
 */
export function parseArgv(keys?:any, options?:any, argv?:Array<string>, onerr?:(k:string)=>void):object


export type TimeWhellItem = {}

/**
 * 时间轮
 */
export class TimeWheel{
    /**
     * 构造一个时间轮
     * @param unit 单位事件长度（毫秒）
     * @param size 时间轮长度
     * @param cb 回调函数
     * @param udata 用户数据
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
    constructor(unit:number, size:number, cb:(idx:TimeWhellItem, obj:any, wheel:TimeWheel)=>void, udata:any)

    /**
     * 启动时间轮
     */
    start():void

    /**
     * 停止时间轮
     */
    stop():void

    /**
     * 将对象插入时间轮
     * @param obj 对象
     * @param toffset 时间偏移，默认为 -1
     * @returns 对象在时间轮中的ID
     */
    join(obj:any, toffset:number):TimeWhellItem
    
    /**
     * 从时间轮中删除一个对象
     * @param o 对象在时间轮中的ID
     */
    remove(o:TimeWhellItem):void

    /**
     * 用户数据
     */
    get data():any

    /**
     * 用户数据
     */
    set data(d:any)
}