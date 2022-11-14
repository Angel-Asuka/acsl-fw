import WebSocket from 'ws'
import {TimeWheel, syncObject} from './utils.js'

const MAX_MESSAGE_SIZE = 65536
const MESSAGE_IDX_BEGIN = 7135
const MESSAGE_IDX_TOKEN = 971394113

export class Protocol{
    constructor(conn, repbeat){
        this.repbeat = repbeat
        this.conn = conn
        this.ridx = MESSAGE_IDX_BEGIN
        this.widx = MESSAGE_IDX_BEGIN
        this.headerBuf = Buffer.alloc(8)
        this.currentData = null
        this.header_size = 0
        this.data_size = 0
        this.msglst = []
    }

    write(data){
        let ret = 0
        if(data.byteLength == null) data = Buffer.from(data)
        let i = 0
        while(i < data.byteLength){
            const l = data.byteLength - i
            if(this.currentData){
                let sz = this.currentData.byteLength - this.data_size
                if(sz > l) sz = l
                data.copy(this.currentData, this.data_size, i, i + sz)
                this.data_size += sz
                i += sz
                if(this.data_size == this.currentData.byteLength){
                    this.msglst.push(this.currentData.toString())
                    this.currentData = null
                }
            }else{
                let sz = this.headerBuf.byteLength - this.header_size
                if(sz > l) sz = l
                data.copy(this.headerBuf, this.header_size, i, i + sz)
                this.header_size += sz
                i += sz
                if(this.header_size == this.headerBuf.byteLength){
                    if(this.ridx != this.headerBuf.readInt32LE(0)){
                        return -1
                    }
                    const szmsg = this.headerBuf.readInt32LE(4)
                    if(szmsg < 0 || szmsg > MAX_MESSAGE_SIZE){
                        return -1
                    }
                    if(szmsg == 0){
                        // Heart beat here, ret = 1 means caller should reset alive-check timer
                        console.log('Beat!')
                        if(this.repbeat) this.send()
                        ret = 1
                    }else{
                        this.ridx = (this.ridx + szmsg) % MESSAGE_IDX_TOKEN
                        this.currentData = Buffer.alloc(szmsg)
                        this.data_size = 0
                    }
                    this.header_size = 0
                }
            }
        }
        return ret
    }

    read(){
        const ret = this.msglst
        this.msglst = []
        return ret
    }

    send(str){
        const hdr = Buffer.alloc(8)
        if(str == null){
            hdr.writeInt32LE(this.widx, 0)
            hdr.writeInt32LE(0, 4)
            this.conn.send(hdr)
        }else{
            const data = Buffer.from(str)
            hdr.writeInt32LE(this.widx, 0)
            hdr.writeInt32LE(data.byteLength, 4)
            this.widx = (this.widx + data.byteLength) % MESSAGE_IDX_TOKEN
            this.conn.send(hdr)
            this.conn.send(data)
        }
    }
}

const K_CS_ENTRY = Symbol()
const K_CS_TW = Symbol()
const K_CS_TWP = Symbol()
const K_CS_TWP2 = Symbol()
const K_CS_ON_CON = Symbol()
const K_CS_ON_CLO = Symbol()
const K_CS_ON_MSG = Symbol()
const K_CS_MSG_PROC = Symbol()
const K_CS_CLO_PROC = Symbol()
const K_CS_DEF_URL = Symbol()
const K_CS_CON = Symbol()
const K_CS_PCL = Symbol()
const K_CS_DEF_OPT = Symbol()
const K_CS_TIMEOUT = Symbol()
const K_CS_TWAIT = Symbol()

/**
 * CS 客户端对象
 */
export class Client{
    /**
     * 构造一个客户端对象
     * @param {object} cfg 配置信息
     * @exampleK_CS_TIMEOUT
     * const cfg = {
     *      url: 'ws:/aaa.com/ws',      // 连接路径
     *      options: {}                 // 连接参数
     *      timeout: 0,                 // 心跳超时时间，秒（0=不检测超时）
     *      on: {                       // 事件处理方法
     *          conn:(conn){}               // 连接事件
     *          close:(conn){}              // 断开（关闭）事件
     *          msg:(msg, conn){}           // 消息事件
     *      }
     *  }
     */
    constructor(cfg){
        this[K_CS_ON_CON] = ()=>{}
        this[K_CS_ON_CLO] = ()=>{}
        this[K_CS_ON_MSG] = ()=>{}
        this[K_CS_TIMEOUT] = 120
        if(cfg){
            if(cfg.on.conn) this[K_CS_ON_CON] = cfg.on.conn
            if(cfg.on.close) this[K_CS_ON_CLO] = cfg.on.close
            if(cfg.on.msg) this[K_CS_ON_MSG] = cfg.on.msg
            if(cfg.url) this[K_CS_DEF_URL] = cfg.url
            if(cfg.options) this[K_CS_DEF_OPT] = cfg.options
            if(cfg.timeout != null) this[K_CS_TIMEOUT] = cfg.timeout
        }
    }

    /**
     * 连接事件处理方法
     */
     set connectionProc(p){
        return this[K_CS_ON_CON] = p
    }

    /**
     * 关闭事件处理方法
     */
    set closeProc(p){
        return this[K_CS_ON_CLO] = p
    }

    /**
     * 消息事件处理方法
     */
    set messageProc(p){
        return this[K_CS_ON_MSG] = p
    }

    open(url, opt){
        this.close()
        if(!url) url = this[K_CS_DEF_URL]
        this[K_CS_TWAIT] = 0
        this[K_CS_CON] =  new WebSocket(url, Object.assign({}, opt, this[K_CS_DEF_OPT]))
        this[K_CS_CON].onclose = this[K_CS_CLO_PROC].bind(this)
        this[K_CS_CON].onerror = this[K_CS_CLO_PROC].bind(this)
        this[K_CS_CON].onmessage = this[K_CS_MSG_PROC].bind(this)
        this[K_CS_TW] = setInterval(this[K_CS_TWP2].bind(this), 100)
    }

    close(){
        if(this[K_CS_TW] != null ){
            clearInterval(this[K_CS_TW])
            this[K_CS_TW] = null
        }
        this[K_CS_PCL] = null
        if(this[K_CS_CON] != null){
            this[K_CS_CON].onmessage = null
            this[K_CS_CON].onclose = null
            this[K_CS_CON].onerror = ()=>{}
            this[K_CS_CON].terminate()
            this[K_CS_CON] = null
            this[K_CS_ON_CLO](this)
        }
    }

    send(msg){
        if(this[K_CS_PCL]) this[K_CS_PCL].send(msg)
    }

    [K_CS_MSG_PROC](ev){
        const ret = this[K_CS_PCL].write(ev.data)
        if(ret >= 0){
            const msgs = this[K_CS_PCL].read()
            for(let m of msgs){
                try{
                    this[K_CS_ON_MSG](m, this)
                }catch(e){console.log(e)}
                if(this[K_CS_PCL] == null) return
            }
            if(ret == 1)
                this[K_CS_TWAIT] = 0
        }else
            this.close()
    }

    [K_CS_CLO_PROC](ev){
        this.close(ev, this)
    }

    [K_CS_TWP](){
        if(++this[K_CS_TWAIT]>3)
            this.close()
        else
            this[K_CS_PCL].send()
    }

    [K_CS_TWP2](){
        if(!this[K_CS_TW]) return
        if(this[K_CS_CON].readyState == 0){
            if(++this[K_CS_TWAIT] > 200)
                this.close()
        }else if(this[K_CS_CON].readyState == 1){
            clearInterval(this[K_CS_TW])
            this[K_CS_TWAIT] = 0
            this[K_CS_PCL] = new Protocol(this[K_CS_CON], false)
            if(this[K_CS_TIMEOUT])
                this[K_CS_TW] = setInterval(this[K_CS_TWP].bind(this), 2000 * this[K_CS_TIMEOUT] / 6)
            else
                this[K_CS_TW] = null
            this[K_CS_ON_CON](this)
        }else{
            this.close()
        }
    }
}

const K_CS_CON_SRV = Symbol()
const K_CS_CON_WS = Symbol()

export class Conn{
    constructor(ws, srv){
        this[K_CS_CON_WS] = ws
        this[K_CS_CON_SRV] = srv
    }

    close(){
        this[K_CS_CON_SRV].close(this)
    }

    send(data){
        this[K_CS_CON_SRV].send(this, data)
    }
}

/**
 * CS 服务端对象
 */
export class Server{
    /**
     * 构造一个服务端对象
     * @param {object} cfg 配置信息
     * @example
     * const cfg = {
     *      app: app,                   // App对象
     *      path: '/ws',                // 监听路径
     *      timeout: 0,                 // 连接超时时间，秒（0=不检测超时）
     *      on: {                       // 事件处理方法
     *          conn:(conn, srv){}          // 连接事件
     *          close:(conn, srv){}         // 断开（关闭）事件
     *          msg:(msg, conn, srv){}      // 消息事件
     *      }
     *  }
     */
    constructor(cfg){
        const c = {
            timeout: 120,
        }
        syncObject(c, cfg)
        this[K_CS_ON_CON] = ()=>{}
        this[K_CS_ON_CLO] = ()=>{}
        this[K_CS_ON_MSG] = ()=>{}

        if(c.timeout)
            this[K_CS_TW] = new TimeWheel(2000, c.timeout / 2, this[K_CS_TWP].bind(this));
        if(cfg){
            if(cfg.app && cfg.path) this.bind(cfg.app, cfg.path)
            if(cfg.on){
                this.connectionProc = cfg.on.conn
                this.closeProc = cfg.on.close
                this.messageProc = cfg.on.msg
            }
        }
    }

    /**
     * 绑定到 App 对象
     * @param {App} app app对象
     * @param {string} path 监听路径
     */
    bind(app, path){
        app.WS(path, this[K_CS_ENTRY], this)
        if(this[K_CS_TW]) this[K_CS_TW].start()
    }

    /**
     * 连接事件处理方法
     */
    set connectionProc(p){
        return this[K_CS_ON_CON] = p
    }

    /**
     * 关闭事件处理方法
     */
    set closeProc(p){
        return this[K_CS_ON_CLO] = p
    }

    /**
     * 消息事件处理方法
     */
    set messageProc(p){
        return this[K_CS_ON_MSG] = p
    }

    /**
     * 关闭连接
     * @param {object} conn 连接对象
     */
    close(conn){
        if(conn[K_CS_CON_WS])
            this.close(conn[K_CS_CON_WS])
        else{
            conn.onmessage = null
            conn.onclose = null
            conn.onerror = null
            if(this[K_CS_TW] && conn.twid){
                this[K_CS_TW].remove(conn.twid)
                conn.twid = null
            }
            conn.cs = null
            conn.terminate()
            try{
                this[K_CS_ON_CLO](conn.ifc, this)
            }catch(e){console.log(e)}
        }
    }
    
    /**
     * 发送数据
     * @param {object} conn 连接对象
     * @param {any} data 要发送的数据
     */
    send(conn, data){
        if(conn[K_CS_CON_WS])
            this.send(conn[K_CS_CON_WS])
        else
            if(conn.cs) conn.cs.send(data)
    }

    [K_CS_ENTRY](req, ws, app){
        ws.cs = new Protocol(ws, true)
        ws.onmessage = this[K_CS_MSG_PROC].bind(this)
        ws.onclose = ws.onerror = this[K_CS_CLO_PROC].bind(this)
        ws.ifc = new Conn(ws, this)
        if(this[K_CS_TW]) ws.twid = this[K_CS_TW].join(ws)
        try{
            this[K_CS_ON_CON](ws.ifc, this)
        }catch(e){console.log(e)}
    }

    [K_CS_TWP](idx, obj, wh){
        this.close(obj)
    }

    [K_CS_MSG_PROC](ev){
        const ret = ev.target.cs.write(ev.data)
        if(ret >= 0){
            const msgs = ev.target.cs.read()
            for(let m of msgs){
                try{
                    this[K_CS_ON_MSG](m, ev.target.ifc, this)
                }catch(e){console.log(e)}
                if(ev.target.cs == null) return
            }
            if(ret == 1){
                if(this[K_CS_TW]){
                    this[K_CS_TW].remove(ev.target.twid)
                    ev.target.twid = this[K_CS_TW].join(ev.target)
                }
            }
        }else
            this.close(ev.target)
    }

    [K_CS_CLO_PROC](ev){
        this.close(ev.target)
    }
}
