/**
 * langley service framework
 * class App
 * cfg = {
 *      root : [OPTIONAL] 根目录
 *      addr : [OPTIONAL] 监听地址
 *      port : 监听端口，默认80
 *      app : [OPTIONAL] 应用目录，App 会自动扫描并加载这个目录中的所有.js文件
 *      modules : [OPTIONAL] 模块列表
 *      static :  静态路径
 *      template : 模板路径
 *      errpages : HTTP 状态页面路径
 *      data : 之后可由 app.data 访问
 *      mod : 添加到 app.modules 中的自定义模块
 *      init : async function(app) 初始化函数，App.run 的时候会在初始化完成、开始接受请求前调用这个函数。
 *      hooks : {
 *          preprocessors : {           请求预处理器
 *              xxx : async function(req, rsp, app)
 *          },
 *          postprocessors : {          请求后处理器
 *              yyy : : async function(req, rsp, app, ret)
 *          },
 *          preprocessingChain : ['xxx'],   默认的预处理链
 *          postprocessingChain : ['yyy']   默认的后处理链
 *      }
 * }
 * 
 * 模块的module.exports中：
 * {
 *      name: '模块名'  // 不设置将使用模块路径来做模块名
 *      /开头的函数     // 提取至页面路由
 *      非/开头的函数   // 保留，不会自动调用
 * }
 * 
 */

import * as fs from 'fs'
import express from 'express';
import expressWs from 'express-ws';
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import {Template} from './template.js'
import {utils} from './utils.js'
import {http} from './http.js'

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

const REG_IP = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/

export class Rsp{
    redirect(url){}
}

/** 应用类 */
export class App{
    
    //#region constructor
    /**
     * 创建一个应用对象
     * @param {Object} cfg 配置对象，参考 Example
     * @example
     * import url from "node:url"
     * import path from "node:path"
     * const root_path = path.dirname(url.fileURLToPath(import.meta.url))
     * 
     * const cfg = {            // 以下内容均为可选项
     *      root : root_path,       // 工程目录，后续所有路径配置都应该相对于根目录来配置
     *      addr : "0.0.0.0",       // 监听地址
     *      port : 80,              // 监听端口，默认80
     *      app : "app",            // 模块文件目录，langley 会自动扫描并尝试加载该目录下的所有 js 文件中的对象，成功加载的对象将可以通过 app.*** 来访问
     *      modules : {},           // 额外的模块表，之后可以通过 app.modules.*** 来访问其中的对象
     *      static :  "static",     // 静态路径， langley 将为该目录下的文件提供静态 http 服务
     *      template : "template",  // 模板路径， langley 将自动加载该目录下的文件为 html 模板，之后可以使用 app.render 来进行渲染
     *      errpages : "errpage",   // 定制的 HTTP 错误页面路径
     *      data : {},              // 用户数据, 之后可由 app.data 访问
     *      init : async (app)=>{}  // 初始化函数，App.run 的时候会在初始化完成、开始接受请求前调用这个函数。
     *      hooks : {               // 页面钩子，定义页面的预处理和后处理程序
     *          preprocessors : {           // 请求预处理器
     *              xxx : async function(req, rsp, app)
     *          },
     *          postprocessors : {          // 请求后处理器
     *              yyy : : async function(req, rsp, app, ret)
     *          },
     *          preprocessingChain : ['xxx'],   //默认的预处理链
     *          postprocessingChain : ['yyy']   //默认的后处理链
     *      }
     * }
     */
    constructor(cfg) {
        if (!cfg) cfg = {}
        this[K_APP_CONFIG] = cfg
        this[K_APP_CONFIG_DATA] = cfg.data
        this[K_APP_ROUTINE] = {}
        this[K_APP_WSROUTINE] = {}
        this[K_APP_MODULES] = {}
        this[K_APP_ERRPAGES] = {}
        this[K_APP_INIT_LIST] = []
        this.utils = utils
        this.http = http
        if (!cfg.root) cfg.root = './'
        else if (cfg.root[cfg.root.length - 1] != '/') cfg.root += '/'
        cfg.ws = false
    }
    //#endregion

    registerProcessor(path, proc, mod){
        const full_path = (mod==null)?path:((mod.prefix || '') + path)
        const default_preprocessingChain = (mod==null)?null:(('preprocessingChain' in mod) ? mod.preprocessingChain : null)
        const defulat_postprocessingChain = (mod==null)?null:(('postprocessingChain' in mod) ? mod.postprocessingChain : null)
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
                this[K_APP_WSROUTINE][full_path+'/.websocket'] = procObj
                this[K_APP_CONFIG].ws = true
            }
            if(procObj.proc)
                this[K_APP_ROUTINE][full_path] = procObj
        }
    }

    //#region load(x)
    /**
     * 加载一个模块，
     * 当输入为字符串时，将会尝试加载这个字符串所指路径所对应的js文件中的所有导出对象；
     * 当输入为一个对象时，将会尝试加载这个对象。
     * @param {String|Object} x 模块文件路径或模块对象
     * @param {String} name 【可选】模块名称
     */
    async load(x, name){
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
    //#endregion

    async [K_APP_LOAD](){
        const cfg = this[K_APP_CONFIG]
        // 尝试扫描 errpages 目录
        if (cfg.errpages) {
            const dl = fs.readdirSync(cfg.root + cfg.errpages);
            dl.forEach((itm) => {
                const code = parseInt(itm);
                if (!isNaN(code)){
                    this[K_APP_ERRPAGES][code] = fs.readFileSync(cfg.root + cfg.errpages + '/' + itm, 'utf8');
                }
            });
        }

        // 尝试扫描 app 所指目录
        if (cfg.app) {
            const dl = fs.readdirSync(cfg.root + cfg.app)
            const ml = []
            dl.forEach((itm) => {
                if (itm.substr(itm.length - 3).toLowerCase() == '.js')
                    ml.push(`${cfg.root}${cfg.app}/${itm}`)
            });
            for(let m of ml) await this.load(m)
        }

        this.Template = new Template()
        if (cfg.template) this.Template.set({root:cfg.root + cfg.template})
        

        // 将配置的模块加入模块列表
        if (cfg.modules){
            for (let m in cfg.modules){
                this[K_APP_MODULES][m] = cfg.modules[m]
                if ('init' in cfg.modules[m]) this[K_APP_INIT_LIST].push(cfg.modules[m].init.bind(cfg.modules[m]))
            }
        }

        this[K_APP_PREPROCESSORS] = {}
        this[K_APP_POSTPROCESSORS] = {}
        this[K_APP_DEF_PREPROCESSINGCHAIN] = []
        this[K_APP_DEF_POSTPROCESSINGCHAIN] = []

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
    }

    get modules() { return this[K_APP_MODULES]; }
    get config() { return this[K_APP_CONFIG]; }
    get data() { return this[K_APP_CONFIG_DATA]; }
    get timestamp() { return parseInt(Date.now()/1000); }

    render(fn, data){ return this.Template.render(fn,data) }

    registerPreprocessor(name, proc) {
        this[K_APP_PREPROCESSORS][name] = proc
    }

    registerPostprocessor(name, proc) {
        this[K_APP_POSTPROCESSORS][name] = proc
    }

    [K_APP_RESPONSE](r, res){
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

        if (!this[K_APP_CONFIG].port) this[K_APP_CONFIG].port = 80
        const srv = express();
        srv.use(bodyParser.urlencoded({ extended: true }));
        srv.use(bodyParser.json());
        srv.use(cookieParser());
        if (this[K_APP_CONFIG].static)
            srv.use(express.static(this[K_APP_CONFIG].root + this[K_APP_CONFIG].static));
        if (this[K_APP_CONFIG].ws){
            expressWs(srv);
            srv.ws('*', async (ws, req)=>{
                if (req.path in this[K_APP_WSROUTINE])
                    return await this[K_APP_WSROUTINE][req.path].wsproc(req, ws, this);
                else
                    ws.terminate()
            })
        }
        
        srv.all('*', async (req, res) => {
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
                                await (new Promise((r) => {
                                    req.rawBody = '';
                                    req.setEncoding('utf8');
                                    req.on('data', function (chk) { 
                                    req.rawBody += chk });
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
        srv.listen(this[K_APP_CONFIG].port, this[K_APP_CONFIG].addr);
    }
}
