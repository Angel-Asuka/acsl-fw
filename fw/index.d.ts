export {Template} from './template'
export {DB} from './db'
export {MDB} from './mdb'
export * as Crypto from './crypto'
export * as Utils from './utils'
export * as Http from './http'

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

export class App {
    constructor(cfg : AppConfig)
    get Template() : import('./template').Template
    registerProcessor(path:string, proc:AppProcessor, mod?:object):void
    load(x:string | AppModule, name?:string):string
    render(fn:string, data:object):string
    registerPreprocessor(name:string, proc:PreProcessor):void
    registerPostprocessor(name:string, proc:PostProcessor):void
    run():never
}