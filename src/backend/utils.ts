import { exec } from 'child_process'
import process from "node:process"
export * from "../common/utils.js"
export * from "../common/timewheel.js"

/**
 * 执行 shell 命令，返回详细信
 * @param cmd 要执行的命令
 */
export async function shellEx(cmd:string):Promise<{ok:boolean, data:string, err:string}>{
    return new Promise(resolve => {
        exec(cmd, (err, stdo, stde) => {
            if(err)
                resolve({ok: false, data: stdo, err: stde})
            else
                resolve({ok: true, data: stdo, err: stde})
        })
    })
}

/**
 * 执行 Shell 命令，返回 stdout 数据
 * @param cmd 要执行的命令
 */
export async function shell(cmd:string):Promise<string|null>{
    const ret = await shellEx(cmd)
    if(ret.ok)
        return ret.data
    return null
}

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
export function parseArgv(keys?:any, options?:any, argv?:Array<string>, onerr?:(k:string)=>void):any{
    if(keys == null) keys = {}
    if(options == null) options = {}
    if(argv == null) argv = process.argv.slice(2)
    if(onerr == null) onerr=(k)=>{}
    const cmdline = {} as {[k:string]:string}
    let prev = ''
    for(let v of argv){
        if(prev in keys){
            cmdline[keys[prev]] = v
            prev = ''
        }else if(prev != ''){
            onerr(prev)
        }else if(v in options){
            cmdline[options[v]] = v
        }else
            prev = v
    }
    if(prev != '') onerr(prev)
    return cmdline
}
