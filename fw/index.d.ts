export type Req = {
    get body():object
    get query():object
    get headers():object
    [key:string]:any
}

export type MessageEvent = {
    target: Conn,
    data: any,
    [key:string]:any
}

export type Conn = {
    send(data:string):void
    terminate():void
    set onmessage(p:(ev:MessageEvent)=>void)
    [key:string]:any
}

export class Rsp{
    /**
     * 通过 HTTP CODE 来发出跳转指令
     * @param uri 目标URL
     */
    redirect:(uri:string)=>void
}

type PreProcessor = (req:Req, rsp:Rsp, app:App)=>Promise<string|void>
type PostProcessor = (req:Req, rsp:Rsp, app:App, ret:string)=>Promise<string|void>
type PreProcessingChain = Array<string|PreProcessor>
type PostProcessingChain = Array<string|PostProcessor>
type RequestProcessor = (req:Req, rsp:Rsp, app:App)=>Promise<string|object|void>
type AppProcessor = RequestProcessor | {
    method?: Array<'GET'|'POST'|'PUT'|'DELETE'|'WS'>,
    preprocessingChain?: PreProcessingChain,
    postprocessingChain?: PostProcessingChain,
    proc?: RequestProcessor,
    conn?: (req:Req, ws:Conn, app:App)=>Promise<void>,
    [key:string]:any
}

type TemplateConfig = {
    root?: string,
    begin_mark?: string,
    end_mark?: string
}

type AppConfig = {
    root?:string,
    addr?:string,
    port?:number,
    ssl?:{
        crt:string,
        key:string,
        ca?:string
    },
    app?:string,
    modules?:object,
    static?:string,
    template?:string | TemplateConfig,
    errpages?:string,
    data?:object,
    init?:(app:App)=>void,
    hooks?:{
        preprocessors?: {[key:string]:PreProcessor},
        postprocessors?: {[key:string]:PostProcessor},
        preprocessingChain?: PreProcessingChain,
        postprocessingChain?: PostProcessingChain
    }
}

type AppModule = {
    name?:string,
    prefix?:string,
    init?:(app:App)=>Promise<void>,
    preprocessors?: {[key:string]:PreProcessor},
    postprocessors?: {[key:string]:PostProcessor},
    preprocessingChain?: PreProcessingChain,
    postprocessingChain?: PostProcessingChain,
    processors:{[key:string]: AppProcessor},
    [key:string]:any
};

export class Template{
    /**
     * 渲染一个模板文件
     * @param fn 模板文件名（相对于 AppConfig.template）
     * @param data 用户数据，模板中可以通过 data 来访问
     */
    render(fn:string, data?:object):string
}

export class App {
    constructor(cfg : AppConfig)
    get Template():Template
    registerProcessor(path:string, proc:AppProcessor, mod?:object):void
    load(x:string | AppModule, name?:string):string
    render(fn:string, data:object):string
    registerPreprocessor(name:string, proc:PreProcessor):void
    registerPostprocessor(name:string, proc:PostProcessor):void
    run():never
}

type SignatureMethod = 'sha1' | 'sha256' | 'rsa-sha256'

export type Crypto = {
    MakeSignature: (data: object | string, key: string, method?: SignatureMethod)=>{nonce: string, ts: number, sign: string}
    VerifySignature: (data: object | string, key: string, sign: {nonce: string, ts: number, sign: string, [key:string]: any}, method?: SignatureMethod)=>boolean
}


/**
 * 将任何数据转化为字符串，如果输入的是一个对象，会先按键名对其中的所有元素进行排序，而后按照"键值"的形式组合成字符串
 * @param {Any} data 任意数据
 * @returns 字符串选项
 */
export type stringFromAny = (data: any) => void

/**
 * 计算 sha1
 * @param {string} v 数据
 * @returns sha1 哈希值
 */
export type sha1 = (v:any) => string

/**
 * 计算 sha256
 * @param {string} v 数据
 * @returns sha256 哈希值
 */
export type sha256 = (v:any) => string

/**
 * 一个新的 UUID （UUID4算法）
 * @returns UUID
 */
export type uuid = () => string

/**
 * 生成一个新 UUID 的 16 进制字符串（32个字符）
 * @returns UUID in HEX
 */
export type uuidHex = () => string

/**
 * 生成随机二进制
 * @param {number} length 长度（字节）
 * @returns 随机的字节数组
 */
export type randomBinary = (length:number) => Array<number>

/**
 * 生成固定长度的随机字符串
 * @param {number} length 长度（字符），默认为 32
 * @param {string} dict 字典
 * @returns 随机字符串
 */
export type randomString = (length:number, dict:string) => string

/**
 * 生成固定长度的随机十六进制字符串
 * @param {number} length 长度（字符），默认为 32
 * @returns 随机十六进制字符串
 */
export type randomHex = (length:number) => string

/**
 * 生成签名数据
 * @param {Any} data 数据
 * @param {string} key 密钥
 * @param {object} options 选项
 * @returns {nonce: string, ts: number, sign: string}
 */
export type makeSignature = (data:any, key:string, options?:{method?:SignatureMethod, nonceLength?:number, nonceDict?: string}) => string

/**
 * 验证签名数据
 * @param {Any} data 数据
 * @param {string} key 密钥
 * @param {object} sign 签名数据
 * @param {object} options 选项
 * @returns 验证通过返回 true，否则返回 false
 */
export type VerifySignature = (data:any, key:string, sign:{nonce:string,ts:number,sign:string}, options?:{method?:SignatureMethod, nonceLength?:number, nonceDict?: string, maxDeltaT: number}) => boolean



declare const app:App;
export default app;