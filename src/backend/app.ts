import * as fs from 'fs'
import express from 'express';
import expressWs from 'express-ws';
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import {Template, TemplateConfig} from './template.js'
import * as httpsys from 'http'
import * as httpssys from 'https'
import path from 'path'

const K_APP_CONFIG = Symbol()
const K_APP_ROUTINE = Symbol()
const K_APP_WSROUTINE = Symbol()
const K_APP_MODULES = Symbol()
const K_APP_ERRPAGES = Symbol()
const K_APP_CONFIG_DATA = Symbol()
const K_APP_PREPROCESSORS = Symbol()
const K_APP_POSTPROCESSORS = Symbol()
const K_APP_DEF_PREPROCESSINGCHAIN = Symbol()
const K_APP_DEF_POSTPROCESSINGCHAIN = Symbol()
const K_APP_USER_INIT = Symbol()
const K_APP_LOAD = Symbol()
const K_APP_INIT_LIST = Symbol()
const K_APP_RESPONSE = Symbol()
const K_APP_HAS_WS = Symbol()

const REG_IP = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/

export type Req = {
    get body():any
    get query():any
    get headers():any
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

export type Rsp = {
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

export type AppConfig = {
    root?:string,
    addr?:string,
    port?:number,
    ssl?:{
        crt:string,
        key:string,
        ca?:string
    },
    app?:string,
    modules?:any,
    static?:string,
    template?:string | TemplateConfig,
    errpages?:string,
    data?:any,
    init?:(app:Server)=>void,
    hooks?:{
        preprocessors?: {[key:string]:PreProcessor},
        postprocessors?: {[key:string]:PostProcessor},
        preprocessingChain?: PreProcessingChain,
        postprocessingChain?: PostProcessingChain
    }
}

export type AppModule = {
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

/** 应用类 */
export class Server{
    /** @internal */ [K_APP_CONFIG]: AppConfig
    /** @internal */ [K_APP_CONFIG_DATA]: any
    /** @internal */ [K_APP_HAS_WS]: boolean
    /** @internal */ [K_APP_ROUTINE]: {[k:string]:any}
    /** @internal */ [K_APP_WSROUTINE]: {[k:string]:any}
    /** @internal */ [K_APP_MODULES]: {[k:string]:any}
    /** @internal */ [K_APP_ERRPAGES]: {[k:number]:any}
    /** @internal */ [K_APP_INIT_LIST]: ((app:Server)=>void)[]
    /** @internal */ [K_APP_PREPROCESSORS]: {[key:string]:PreProcessor}
    /** @internal */ [K_APP_POSTPROCESSORS]: {[key:string]:PostProcessor}
    /** @internal */ [K_APP_DEF_PREPROCESSINGCHAIN]: PreProcessingChain
    /** @internal */ [K_APP_DEF_POSTPROCESSINGCHAIN]: PostProcessingChain
    /** @internal */ [K_APP_USER_INIT]: ((app:Server)=>void) | null
    Template: Template
    constructor(cfg: AppConfig) {
        if (!cfg) cfg = {}
        this[K_APP_CONFIG] = cfg
        this[K_APP_CONFIG_DATA] = cfg.data || {}
        this[K_APP_ROUTINE] = {}
        this[K_APP_WSROUTINE] = {}
        this[K_APP_MODULES] = {}
        this[K_APP_ERRPAGES] = {}
        this[K_APP_INIT_LIST] = []
        this[K_APP_HAS_WS] = false
        this[K_APP_PREPROCESSORS] = {}
        this[K_APP_POSTPROCESSORS] = {}
        this[K_APP_DEF_PREPROCESSINGCHAIN] = []
        this[K_APP_DEF_POSTPROCESSINGCHAIN] = []
        this.Template = new Template()
        this[K_APP_USER_INIT] = null
        if (!cfg.root) cfg.root = './'
        else if (cfg.root[cfg.root.length - 1] != '/') cfg.root += '/'
    }

    /**
     * 注册一个 GET 请求处理方法
     * @param path 路径
     * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
     */
    GET(path:string, proc:RequestProcessor, mod?:any):void{ this.registerProcessor(path, {method:['GET'], proc:proc, mod}) }

    /**
      * 注册一个 POST 请求处理方法
      * @param path 路径
      * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
      */
    POST(path:string, proc:RequestProcessor, mod?:any):void{ this.registerProcessor(path, {method:['POST'], proc:proc, mod}) }

    /**
      * 注册一个 PUT 请求处理方法
      * @param path 路径
      * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
      */
    PUT(path:string, proc:RequestProcessor, mod?:any):void{ this.registerProcessor(path, {method:['PUT'], proc:proc, mod}) }

    /**
      * 注册一个 DELETE 请求处理方法
      * @param path 路径
      * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
      */
    DELETE(path:string, proc:RequestProcessor, mod?:any):void{ this.registerProcessor(path, {method:['DELETE'], proc:proc, mod}) }

    /**
      * 注册一个 WebSocket 连接处理方法
      * @param path 路径
      * @param proc 处理方法
      * @param mod 处理方法要绑定的this对象
      */
    WS(path:string, proc:WSProcessor, mod?:any):void{ this.registerProcessor(path, {conn:proc}, mod) }

    /**
     * 注册一个请求处理器
     * @param path 路径
     * @param {proc 处理器
     * @param mod 模块
     */
    registerProcessor(path:string, proc:AppProcessor, mod?:any):void{
        const full_path = (mod==null)?path:((mod.prefix || '') + path)
        const default_preprocessingChain = (mod==null)?null:(('preprocessingChain' in mod) ? mod.preprocessingChain : [])
        const defulat_postprocessingChain = (mod==null)?null:(('postprocessingChain' in mod) ? mod.postprocessingChain : [])
        if(typeof(proc) == 'function'){
            this[K_APP_ROUTINE][full_path] = {
                GET: true,
                POST: true,
                PUT: false,
                DELETE: false,
                preprocessingChain: default_preprocessingChain,
                postprocessingChain: defulat_postprocessingChain,
                proc: proc.bind(mod),
                mod: mod,
                path: path,
                cfg: proc
            }
        }else if(typeof(proc) == 'object'){
            const procObj = {
                GET: (proc.method && proc.method.indexOf('GET') >= 0),
                POST: (proc.method && proc.method.indexOf('POST') >= 0),
                PUT: (proc.method && proc.method.indexOf('PUT') >= 0),
                DELETE: (proc.method && proc.method.indexOf('DELETE') >= 0),
                preprocessingChain: proc.preprocessingChain ? proc.preprocessingChain : default_preprocessingChain,
                postprocessingChain: proc.postprocessingChain ? proc.postprocessingChain : defulat_postprocessingChain,
                proc: proc.proc?proc.proc.bind(mod):null,
                wsproc: proc.conn?proc.conn.bind(mod):null,
                mod: mod,
                path: path,
                cfg: proc
            }
            if(procObj.wsproc){
                this[K_APP_WSROUTINE][((full_path=='/')?'':full_path)+'/.websocket'] = procObj
                this[K_APP_HAS_WS] = true
            }
            if(procObj.proc)
                this[K_APP_ROUTINE][full_path] = procObj
        }
    }

    /**
     * 加载一个模块，
     * 当输入为字符串时，将会尝试加载这个字符串所指路径所对应的js文件中的所有导出对象；
     * 当输入为一个对象时，将会尝试加载这个对象。
     * @param {String|Object} x 模块文件路径或模块对象
     * @param {String} name 【可选】模块名称
     */
    async load(x:any, name?:string){
        if(typeof(x) == 'object'){
            if(!x.preprocessors) x.preprocessors = {}
            if(!x.postprocessors) x.postprocessors = {}
            for(let p in x){
                if (p[0] == '/')
                    this.registerProcessor(p, x[p], x)
            }
            if(typeof(x.processors) == 'object'){
                for(let p in x.processors){
                    this.registerProcessor((p[0] == '/')?p:('/' + p), x.processors[p], x)
                }
            }
            if ('name' in x)
                this[K_APP_MODULES][x.name] = x;
            else if(name)
                this[K_APP_MODULES][name] = x;
            if ('init' in x)
                this[K_APP_INIT_LIST].push(x.init.bind(x))
        }else if(typeof(x) == "string"){
            const mod = await import(x)
            for(let x in mod){
                await this.load(mod[x], x)
            }
        }
    }

    /** @internal */
    async [K_APP_LOAD](){
        const cfg = this[K_APP_CONFIG]

        // 备份 CWD
        const cwd = process.cwd()

        // 设置当前目录
        if (cfg.root)
            process.chdir(cfg.root)

        // 尝试扫描 errpages 目录
        if (cfg.errpages) {
            const dl = fs.readdirSync(path.resolve(cfg.errpages));
            dl.forEach((itm) => {
                const code = parseInt(itm);
                if (!isNaN(code)){
                    this[K_APP_ERRPAGES][code] = fs.readFileSync(path.resolve(cfg.errpages + '/' + itm, 'utf8'));
                }
            });
        }

        // 尝试扫描 app 所指目录
        if (cfg.app) {
            const app_path = path.resolve(cfg.app)
            if(fs.existsSync(app_path)){
                const dl = fs.readdirSync(app_path)
                const ml = [] as string[]
                dl.forEach((itm) => {
                    if (itm.substring(itm.length - 3).toLowerCase() == '.js')
                        ml.push(`${app_path}/${itm}`)
                });
                for(let m of ml) await this.load(m)
            }
        }

        if (cfg.template){
            if (typeof cfg.template === 'string')
                this.Template.set({root: path.resolve(cfg.template)})
            else if(typeof cfg.template === 'object'){
                this.Template.set(cfg.template, cfg.root)
            }
        }
        
        // 将配置的模块加入模块列表
        if (cfg.modules){
            for (let m in cfg.modules){
                this[K_APP_MODULES][m] = cfg.modules[m]
                if ('init' in cfg.modules[m]) this[K_APP_INIT_LIST].push(cfg.modules[m].init.bind(cfg.modules[m]))
            }
        }

        // 记录前后处理器
        if (cfg.hooks){
            if(cfg.hooks.preprocessors) this[K_APP_PREPROCESSORS] = cfg.hooks.preprocessors
            if(cfg.hooks.postprocessors) this[K_APP_POSTPROCESSORS] = cfg.hooks.postprocessors
            if(cfg.hooks.preprocessingChain) this[K_APP_DEF_PREPROCESSINGCHAIN] = cfg.hooks.preprocessingChain
            if(cfg.hooks.postprocessingChain) this[K_APP_DEF_POSTPROCESSINGCHAIN] = cfg.hooks.postprocessingChain
        }

        // 记录初始化函数
        if (cfg.init)
            this[K_APP_USER_INIT] = cfg.init

        // 恢复 CWD
        process.chdir(cwd)
    }

    get modules() { return this[K_APP_MODULES]; }
    get config() { return this[K_APP_CONFIG]; }
    get data():any { return this[K_APP_CONFIG_DATA]; }
    get timestamp() { return Math.floor(Date.now()/1000); }

    render(fn:string, data:any){ return this.Template.render(fn,data) }

    registerPreprocessor(name:string, proc:PreProcessor) {
        this[K_APP_PREPROCESSORS][name] = proc
    }

    registerPostprocessor(name:string, proc:PostProcessor) {
        this[K_APP_POSTPROCESSORS][name] = proc
    }

    /** @internal */
    [K_APP_RESPONSE](r:any, res:any){
        if(typeof(r) == 'number'){
            if(r in this[K_APP_ERRPAGES])
                res.status(r).send(this[K_APP_ERRPAGES][r])
            else
                res.sendStatus(r)
        }else if(typeof(r) == 'object')
            res.send(JSON.stringify(r))
        else
            res.send(r)
    }

    /**
     * 启动 App
     */
    async run() {
        await this[K_APP_LOAD]()

        const srv:any = express();
        srv.use(bodyParser.urlencoded({ extended: true }));
        srv.use(bodyParser.json());
        srv.use(cookieParser());
        if (this[K_APP_CONFIG].static)
            srv.use(express.static(((this[K_APP_CONFIG].static[0] == '/')?'':this[K_APP_CONFIG].root) + this[K_APP_CONFIG].static));
        if(this[K_APP_CONFIG].ssl){
            if (!this[K_APP_CONFIG].port) this[K_APP_CONFIG].port = 443
            const credentials:any = {
                cert:this[K_APP_CONFIG].ssl.crt,
                key:this[K_APP_CONFIG].ssl.key
            }
            if(this[K_APP_CONFIG].ssl.ca){
                credentials.ca = this[K_APP_CONFIG].ssl.ca
                credentials.requestCert = true
                credentials.rejectUnauthorized = true
            }
            srv._listener = httpssys.createServer(credentials, srv);
        }else{
            if (!this[K_APP_CONFIG].port) this[K_APP_CONFIG].port = 80
            srv._listener = httpsys.createServer(srv);
        }

        if (this[K_APP_HAS_WS]){
            expressWs(srv, srv._listener);
            srv.ws('*', async (ws: any, req: any)=>{
                if (req.path in this[K_APP_WSROUTINE]){
                    let ipstr = req.headers['x-forwarded-for'] || req.headers['X-Real-IP'] || req.ip || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || ''
                    const iparr = ipstr.split(',')
                    if(iparr.length) ipstr = iparr[0]
                    const ip = REG_IP.exec(ipstr)
                    if(ip)
                        req.clientAddress = ip[0]
                    else
                        req.clientAddress = ipstr
                    return await this[K_APP_WSROUTINE][req.path].wsproc(req, ws, this);
                } else
                    ws.terminate()
            })
        }
        
        srv.all('*', async (req: any, res: any) => {
            if (req.path in this[K_APP_ROUTINE]) {
                const func = this[K_APP_ROUTINE][req.path];
                if (func[req.method]) {
                    try{
                        // 处理客户端 IP >> req.clientAddress
                        let ipstr = req.headers['x-forwarded-for'] || req.headers['X-Real-IP'] || req.ip || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || ''
                        const iparr = ipstr.split(',')
                        if(iparr.length) ipstr = iparr[0]
                        const ip = REG_IP.exec(ipstr)
                        if(ip)
                            req.clientAddress = ip[0]
                        else
                            req.clientAddress = ipstr

                        // 识别客户端类型 >> req.clientType
                        if(req.headers['user-agent'] && req.headers['user-agent'].indexOf('MicroMessenger') >= 0)
                            req.clientType = 'WeChat'
                        else
                            req.clientType = 'Unknown'

                        // 执行预处理链
                        for(let h of func.preprocessingChain){
                            const hret = await h(req, res, this, func)
                            if (typeof(hret) == 'boolean'){
                                if (hret != true) return;
                            } else if (hret != null) return this[K_APP_RESPONSE](hret, res)
                        }
                        
                        // 接收 Post 数据
                        if (req.method == 'POST') {
                            if(req.headers['content-type'] != 'application/x-www-form-urlencoded' && req.headers['content-type'] != 'application/json'){
                                await (new Promise((r:any) => {
                                    req.rawBody = '';
                                    req.setEncoding('utf8');
                                    req.on('data', function (chk:any) { req.rawBody += chk });
                                    req.on('end', function () {
                                        try{
                                            req.body = JSON.parse(req.rawBody);
                                        }catch(e){
                                            req.body = req.rawBody;
                                        }
                                        r();
                                    });
                                }));
                            }
                        }

                        // 处理请求
                        let ret2 = await func.proc(req, res, this);

                        // 执行后处理链
                        for(let h of func.postprocessingChain)
                            ret2 = await h(req, res, this, func, ret2)

                        // 执行返回（如果有）
                        if (ret2) this[K_APP_RESPONSE](ret2, res)
                    }catch(e){
                        console.log(e)
                        res.status(500).send('Application Error')
                    }
                } else {
                    console.log(`Unsupport method ${req.method} in ${func.path}`)
                    res.status(400).send('Denine')
                }
            } else
                res.status(404).send('Not Found.')
        });

        // 初始化模块
        for (let p of this[K_APP_INIT_LIST]) await p(this)

        // 全局初始化
        if (this[K_APP_USER_INIT])
            await this[K_APP_USER_INIT](this)
        
        // 初始化前后处理器
        for (let p in this[K_APP_ROUTINE]) {
            const itm = this[K_APP_ROUTINE][p]
            const pre = []
            const post = []
            const pre_lst = itm.preprocessingChain ? itm.preprocessingChain : this[K_APP_DEF_PREPROCESSINGCHAIN]
            const post_lst = itm.postprocessingChain ? itm.postprocessingChain : this[K_APP_DEF_POSTPROCESSINGCHAIN]
            for (let q of pre_lst){
                if (typeof(q) == 'function')
                    pre.push(q.bind(itm.mod))
                else if (q in itm.mod.preprocessors)
                    pre.push(itm.mod.preprocessors[q].bind(itm.mod))
                else if (q in this[K_APP_PREPROCESSORS])
                    pre.push(this[K_APP_PREPROCESSORS][q].bind(itm.mod))
            }
            for (let q of post_lst){
                if (typeof(q) == 'function')
                    post.push(q.bind(itm.mod))
                else if (q in itm.mod.postprocessors)
                    post.push(itm.mod.postprocessors[q].bind(itm.mod))
                else if (q in this[K_APP_POSTPROCESSORS])
                    post.push(this[K_APP_POSTPROCESSORS][q].bind(itm.mod))
            }
            itm.preprocessingChain = pre
            itm.postprocessingChain = post
        }
        
        srv._listener.listen(this[K_APP_CONFIG].port, this[K_APP_CONFIG].addr)
    }
}
