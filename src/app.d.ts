import { App } from '.'

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
    send(data:any):void
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

type PreProcessor = (req:Req, rsp:Rsp, app:Server)=>Promise<string|void>
type PostProcessor = (req:Req, rsp:Rsp, app:Server, ret:string)=>Promise<string|void>
type PreProcessingChain = Array<string|PreProcessor>
type PostProcessingChain = Array<string|PostProcessor>
type RequestProcessor = (req:Req, rsp:Rsp, app:Server)=>Promise<string|object|void>
type WSProcessor = (req:Req, ws:Conn, app:Server)=>Promise<void>
type AppProcessor = RequestProcessor | {
    method?: Array<'GET'|'POST'|'PUT'|'DELETE'|'WS'>,
    preprocessingChain?: PreProcessingChain,
    postprocessingChain?: PostProcessingChain,
    proc?: RequestProcessor,
    conn?: WSProcessor,
    [key:string]:any
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
    template?:string | import('./template').TemplateConfig,
    errpages?:string,
    data?:object,
    init?:(app:Server)=>void,
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
    init?:(app:Server)=>Promise<void>,
    preprocessors?: {[key:string]:PreProcessor},
    postprocessors?: {[key:string]:PostProcessor},
    preprocessingChain?: PreProcessingChain,
    postprocessingChain?: PostProcessingChain,
    processors:{[key:string]: AppProcessor},
    [key:string]:any
};

export class Server {
    constructor(cfg : AppConfig)
    get Template() : import('./template').Template

    /**
     * 注册一个 GET 请求处理方法
     * @param path 路径
     * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
     */
     GET(path:string, proc:RequestProcessor, mod?:object):void

     /**
      * 注册一个 POST 请求处理方法
      * @param path 路径
      * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
      */
     POST(path:string, proc:RequestProcessor, mod?:object):void
 
     /**
      * 注册一个 PUT 请求处理方法
      * @param path 路径
      * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
      */
     PUT(path:string, proc:RequestProcessor, mod?:object):void
 
     /**
      * 注册一个 DELETE 请求处理方法
      * @param path 路径
      * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
      */
     DELETE(path:string, proc:RequestProcessor, mod?:object):void
 
     /**
      * 注册一个 WebSocket 连接处理方法
      * @param path 路径
      * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
      */
     WS(path:string, proc:WSProcessor, mod?:object):void

    get modules():any
    get config():AppConfig
    get data():any
    get timestamp():number

    registerProcessor(path:string, proc:AppProcessor, mod?:object):void
    load(x:string | AppModule, name?:string):string
    render(fn:string, data:object):string
    registerPreprocessor(name:string, proc:PreProcessor):void
    registerPostprocessor(name:string, proc:PostProcessor):void
    run():void
}