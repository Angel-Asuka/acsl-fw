'use strict'

/**
 * langley service framework
 * class App
 * cfg = {
 *      root : [OPTIONAL] 根目录
 *      port : 监听端口，默认80
 *      app : [OPTIONAL] 应用目录，App 会自动扫描并加载这个目录中的所有.js文件
 *      modules : [OPTIONAL] 模块列表
 *      static :  静态路径
 *      template : 模板路径
 *      errpages : HTTP 状态页面路径
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

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const K_APP_CONFIG = Symbol();
const K_APP_ROUTINE = Symbol();
const K_APP_MODULES = Symbol();
const K_APP_ERRPAGES = Symbol();
const V_APP_EMPTY_FUNC = () => { }


module.exports = (__l)=>{return class {
    constructor(cfg) {
        this.Langley = __l;

        if (!cfg) cfg = {}
        this[K_APP_CONFIG] = cfg;
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

        // 预加载所有模块
        for (let m of cfg.modules) {
            const mod = require(cfg.root + m);
            for (let p in mod) {
                if (p[0] == '/') {
                    if (typeof (mod[p]) == 'function') {
                        this[K_APP_ROUTINE][p] = {
                            GET: true,
                            POST: true,
                            pre: mod[p].pre ? mod[p].pre.bind(mod) : V_APP_EMPTY_FUNC,
                            proc: mod[p].bind(mod)
                        }
                    } else if (typeof (mod[p] == 'object') && mod[p].proc) {
                        this[K_APP_ROUTINE][p] = {
                            GET: (mod[p].method && mod[p].method.indexOf('GET') >= 0),
                            POST: (mod[p].method && mod[p].method.indexOf('POST') >= 0),
                            pre: mod[p].pre ? mod[p].pre.bind(mod) : V_APP_EMPTY_FUNC,
                            proc: mod[p].proc.bind(mod)
                        }
                    }
                }
            }
            if ('name' in mod)
                this[K_APP_MODULES][mod.name] = mod;
            else
                this[K_APP_MODULES][m] = mod;
        }

        // 初始化模块
        for (let m in this[K_APP_MODULES]) {
            if (this[K_APP_MODULES][m].init)
                this[K_APP_MODULES][m].init(this);
        }
    }

    get modules() { return this[K_APP_MODULES]; }

    run() {
        if (!this[K_APP_CONFIG].port) this[K_APP_CONFIG].port = 80;
        const srv = express();
        srv.use(bodyParser.urlencoded({ extended: true }));
        srv.use(cookieParser());
        if (this[K_APP_CONFIG].static)
            srv.use(express.static(this[K_APP_CONFIG].root + this[K_APP_CONFIG].static));
        srv.all('*', async (req, res) => {
            if (req.path in this[K_APP_ROUTINE]) {
                const func = this[K_APP_ROUTINE][req.path];
                if (func[req.method]) {
                    if (req.method == 'POST') {
                        const ret = await func.pre(req, res, this);
                        if (ret) {
                            res.send(ret);
                            return;
                        }
                        await (new Promise((r) => {
                            req.rawBody = '';
                            req.setEncoding('utf8');
                            req.on('data', function (chk) { req.rawBody += chk });
                            req.on('end', function () {
                                req.body = JSON.parse(req.rawBody);
                                r();
                            });
                        }));
                    }
                    const ret2 = await func.proc(req, res, this);
                    if (ret2) {
                        if(typeof(ret2) == 'number' && ret2 in this[K_APP_ERRPAGES])
                            res.status(ret2).send(this[K_APP_ERRPAGES][ret2]);
                        else
                            res.send(ret2);
                    }
                } else
                    res.status(400).send('Denine');
            } else
                res.status(404).send('Not Found.');
        });
        srv.listen(this[K_APP_CONFIG].port);
        console.log(this[K_APP_CONFIG].port);
        return true;
    }
}}