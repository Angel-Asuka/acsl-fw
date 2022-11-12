import {TimeWheel, syncObject} from './utils.js'

const MAX_MESSAGE_SIZE = 65536
const MESSAGE_IDX_BEGIN = 7135
const MESSAGE_IDX_TOKEN = 971394113

export class Protocol{
    constructor(conn){
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
                        return false
                    }
                    const szmsg = this.headerBuf.readInt32LE(4)
                    if(szmsg <= 0 || szmsg > MAX_MESSAGE_SIZE){
                        return false
                    }
                    this.ridx = (this.ridx + szmsg) % MESSAGE_IDX_TOKEN
                    this.currentData = Buffer.alloc(szmsg)
                    this.header_size = 0
                    this.data_size = 0
                }
            }
        }
        return true
    }

    read(){
        const ret = this.msglst
        this.msglst = []
        return ret
    }

    send(str){
        const hdr = Buffer.alloc(8)
        const data = Buffer.from(str)
        hdr.writeInt32LE(this.widx, 0)
        hdr.writeInt32LE(data.byteLength, 4)
        this.widx = (this.widx + data.byteLength) % MESSAGE_IDX_TOKEN
        this.conn.send(hdr)
        this.conn.send(data)
    }
}

const K_SERVER_ENTRY = Symbol()
const K_SERVER_TW = Symbol()
const K_SERVER_TWP = Symbol()
const K_SERVER_ON_CON = Symbol()
const K_SERVER_ON_CLO = Symbol()
const K_SERVER_ON_MSG = Symbol()
const K_SERVER_MSG_PROC = Symbol()
const K_SERVER_CLO_PROC = Symbol()

/**
 * CS 客户端对象
 */
export class Connection{
    /**
     * 构造一个客户端对象
     * @param {object} cfg 配置信息
     * @example
     * const cfg = {
     *      url: 'ws:/aaa.com/ws',      // 连接路径
     *      timeout: 0,                 // 心跳超时时间，秒（0=不检测超时）
     *      on: {                       // 事件处理方法
     *          conn:(conn){}               // 连接事件
     *          close:(conn){}              // 断开（关闭）事件
     *          msg:(msg, conn){}           // 消息事件
     *      }
     *  }
     */
    constructor(cfg){

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
        if(timeout)
            this[K_SERVER_TW] = new TimeWheel(2000, c.timeout / 2, this[K_SERVER_TWP].bind(this));
        if(cfg){
            if(cfg.app && cfg.path) this.bind(cfg.app, cfg.path)
            if(cfg.on){
                if(cfg.on.conn) this.connectionProc = cfg.on.conn
                if(cfg.on.close) this.closeProc = cfg.on.close
                if(cfg.on.msg) this.messageProc = cfg.on.msg
            }
        }
    }

    /**
     * 绑定到 App 对象
     * @param {App} app app对象
     * @param {string} path 监听路径
     */
    bind(app, path){
        app.WS(path, this[K_SERVER_ENTRY], this)
        if(this[K_SERVER_TW]) this[K_SERVER_TW].start()
    }

    /**
     * 连接事件处理方法
     */
    set connectionProc(p){
        return this[K_SERVER_ON_CON] = p
    }

    /**
     * 关闭事件处理方法
     */
    set closeProc(p){
        return this[K_SERVER_ON_CLO] = p
    }

    /**
     * 消息事件处理方法
     */
    set messageProc(p){
        return this[K_SERVER_ON_MSG] = p
    }

    /**
     * 关闭连接
     * @param {object} conn 连接对象
     */
    close(conn){
        conn.onmessage = null
        conn.onclose = null
        conn.onerror = null
        if(this[K_SERVER_TW] && conn.twid){
            this[K_SERVER_TW].remove(conn.twid)
            conn.twid = null
        }
        conn.cs = null
        conn.terminate()
        try{
            this[K_SERVER_ON_CLO](conn, this)
        }catch(e){console.log(e)}
    }

    [K_SERVER_ENTRY](req, ws, app){
        ws.cs = new Protocol(ws)
        ws.onmessage = this[K_SERVER_MSG_PROC].bind(this)
        ws.onclose = ws.onerror = this[K_SERVER_CLO_PROC].bind(this)
        if(this[K_SERVER_TW]) ws.twid = this[K_SERVER_TW].join(ws)
        try{
            this[K_SERVER_ON_CON](ws, this)
        }catch(e){console.log(e)}
    }

    [K_SERVER_TWP](idx, obj, wh){
        this.close(obj)
    }

    [K_SERVER_MSG_PROC](ev){
        if(ev.target.cs.write(ev.data)){
            const msgs = ev.target.cs.read()
            for(let m of msgs){
                try{
                    this[K_SERVER_ON_MSG](m, ev.target, this)
                }catch(e){console.log(e)}
                if(ev.target.cs == null) return
            }
            if(this[K_SERVER_TW]){
                this[K_SERVER_TW].remove(ev.target.twid)
                ev.target.twid = this[K_SERVER_TW].join(ev.target)
            }
        }else
            this.close(ev.target)
    }

    [K_SERVER_CLO_PROC](ev){
        this.close(ev.target)
    }
}
