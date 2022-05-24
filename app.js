'use strict'

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

const fs = require('fs')
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

const K_APP_CONFIG = Symbol()
const K_APP_ROUTINE = Symbol()
const K_APP_MODULES = Symbol()
const K_APP_ERRPAGES = Symbol()
const K_APP_CONFIG_DATA = Symbol()
const K_APP_PREPROCESSORS = Symbol()
const K_APP_POSTPROCESSORS = Symbol()
const K_APP_DEF_PREPROCESSINGCHAIN = Symbol()
const K_APP_DEF_POSTPROCESSINGCHAIN = Symbol()
const K_APP_USER_INIT = Symbol()

const K_APP_RESPONSE = Symbol()

const REG_IP = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/

module.exports = (__l)=>{return class {
    constructor(cfg) {
        this.Langley = __l;

        if (!cfg) cfg = {}
        this[K_APP_CONFIG] = cfg;
        this[K_APP_CONFIG_DATA] = cfg.data;
        this[K_APP_ROUTINE] = {};
        this[K_APP_MODULES] = {};
        this[K_APP_ERRPAGES] = {};
        if (!cfg.modules) cfg.modules = [];

        if (!cfg.root)
            cfg.root = '../';
        else if (cfg.root[cfg.root.length - 1] != '/')
            cfg.root += '/';

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

        // 尝试扫描 root 所指目录
        if (cfg.app) {
            const dl = fs.readdirSync(cfg.root + cfg.app);
            dl.forEach((itm) => {
                if (itm.substr(itm.length - 3).toLowerCase() == '.js')
                    cfg.modules.push(cfg.app + '/' + itm.substr(0, itm.length - 3));
            });
        }

        if (cfg.template)
            this.Template = new this.Langley.Template({root:cfg.root + cfg.template})

        this.Http = this.Langley.Http
        this.Utils = this.Langley.Utils

        // 预加载所有模块
        for (let m of cfg.modules) {
            const mod = require(cfg.root + m);
            for (let p in mod) {
                if (p[0] == '/') {
                    if (typeof (mod[p]) == 'function') {
                        this[K_APP_ROUTINE][p] = {
                            GET: true,
                            POST: true,
                            preprocessingChain: null,
                            postprocessingChain: null,
                            proc: mod[p].bind(mod),
                            mod: mod,
                            path: p
                        }
                    } else if (typeof (mod[p] == 'object') && mod[p].proc) {
                        if(mod[p].method == null) mod[p].method = ['GET', 'POST']
                        this[K_APP_ROUTINE][p] = {
                            GET: (mod[p].method && mod[p].method.indexOf('GET') >= 0),
                            POST: (mod[p].method && mod[p].method.indexOf('POST') >= 0),
                            preprocessingChain: mod[p].preprocessingChain ? mod[p].preprocessingChain : null,
                            postprocessingChain: mod[p].postprocessingChain ? mod[p].postprocessingChain : null,
                            proc: mod[p].proc.bind(mod),
                            mod: mod,
                            path: p
                        }
                    }
                }
            }
            if ('name' in mod)
                this[K_APP_MODULES][mod.name] = mod;
            else
                this[K_APP_MODULES][m] = mod;
        }

        // 将配置的模块加入模块列表
        if (cfg.mod){
            for (let m in cfg.mod)
                this[K_APP_MODULES][m] = cfg.mod[m]
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
    get timestamp() { return Math.floor(Date.now()/1000); }

    registerPreprocessor(name, proc) {
        this[K_APP_PREPROCESSORS][name] = proc
    }

    registerPostprocessor(name, proc) {
        this[K_APP_POSTPROCESSORS][name] = proc
    }

    [K_APP_RESPONSE](r, res){
        if(typeof(r) == 'number' && r in this[K_APP_ERRPAGES])
            res.status(r).send(this[K_APP_ERRPAGES][r])
        else if(typeof(r) == 'object')
            res.send(JSON.stringify(r))
        else
            res.send(r)
    }

    async run() {
        if (!this[K_APP_CONFIG].port) this[K_APP_CONFIG].port = 80;
        const srv = express();
        srv.use(bodyParser.urlencoded({ extended: true }));
        srv.use(bodyParser.json());
        srv.use(cookieParser());
        if (this[K_APP_CONFIG].static)
            srv.use(express.static(this[K_APP_CONFIG].root + this[K_APP_CONFIG].static));
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
                            if(!req.complete){
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
        for (let m in this[K_APP_MODULES]) {
            if (this[K_APP_MODULES][m].init)
                await this[K_APP_MODULES][m].init(this)
        }

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
                else if (q in this[K_APP_PREPROCESSORS])
                    pre.push(this[K_APP_PREPROCESSORS][q].bind(itm.mod))
            }
            for (let q of post_lst){
                if (typeof(q) == 'function')
                    post.push(q.bind(itm.mod))
                else if (q in this[K_APP_POSTPROCESSORS])
                    post.push(this[K_APP_POSTPROCESSORS][q].bind(itm.mod))
            }
            itm.preprocessingChain = pre
            itm.postprocessingChain = post
        }
        srv.listen(this[K_APP_CONFIG].port, this[K_APP_CONFIG].addr);
        return true;
    }
}}