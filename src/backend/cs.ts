import WebSocket from 'ws'
import {TimeWheel, syncObject} from './utils.js'

const K_CS_ENTRY = Symbol()
const K_CS_TW = Symbol()
const K_CS_TWP = Symbol()
const K_CS_ON_CON = Symbol()
const K_CS_ON_CLO = Symbol()
const K_CS_ON_MSG = Symbol()
const K_CS_ON_RPC = Symbol()
const K_CS_MSG_PROC = Symbol()
const K_CS_CLO_PROC = Symbol()
const K_RPC_MAP = Symbol()
const K_RPC_ID = Symbol()
const K_CS_CON_SRV = Symbol()
const K_CS_CON_WS = Symbol()
const K_CS_CLI_ADDR = Symbol()
const K_CS_TWP2 = Symbol()
const K_CS_DEF_URL = Symbol()
const K_CS_CON = Symbol()
const K_CS_PCL = Symbol()
const K_CS_DEF_OPT = Symbol()
const K_CS_TIMEOUT = Symbol()
const K_CS_TWAIT = Symbol()

const MAX_MESSAGE_SIZE = 65536
const MESSAGE_IDX_BEGIN = 7135
const MESSAGE_IDX_TOKEN = 971394113


/**
 * 客户端连接事件处理方法
 * @param cli 新连上的连接对象
 */
 type ClientConnectionProc = (cli:Client) => void

 /**
  * 客户端关闭事件处理方法
  * @param cli 被关闭的连接对象
  */
type ClientCloseProc = (cli:Client) => void
 
 /**
  * 客户端消息事件处理方法
  * @param data 消息数据
  * @param cli 相关的连接对象
  */
type ClientMessageProc = (msg:Buffer, cli:Client) => void

/**
 * 客户端远程过程调用事件处理方法
 * @param data 消息数据
 * @param rpcid 调用ID
 * @param cli 相关的连接对象
 */
type ClientRpcProc = (msg:Buffer, rpcid:number, cli:Client) => void

/**
 * 连接事件处理方法
 * @param conn 新连上的连接对象
 * @param srv 服务对象
 */
type ConnectionProc = (conn:Conn, srv:Server) => void

/**
 * 关闭事件处理方法
 * @param conn 被关闭的连接对象
 * @param srv 服务对象
 */
type CloseProc = (conn:Conn, srv:Server) => void

/**
 * 消息事件处理方法
 * @param msg 消息
 * @param conn 相关的连接对象
 * @param srv 服务对象
 */
type MessageProc = (msg:Buffer, conn:Conn, srv:Server) => void

/**
 * 客户端远程过程调用事件处理方法
 * @param data 消息数据
 * @param rpcid 调用ID
 * @param cli 相关的连接对象
 */
 type RpcProc = (msg:Buffer, rpcid:number, conn:Conn, srv:Server) => void

type ClientConfig = {
    url?:string,
    options?:object
    timeout?: number,
    on?:{
        conn?:ClientConnectionProc
        close?:ClientCloseProc
        msg?:ClientMessageProc
        rpc?:ClientRpcProc
    }
}

export class Protocol{
    repbeat : boolean
    conn : any
    ridx : number
    widx : number
    headerBuf : any
    currentData : any
    header_size : number
    data_size : number
    current_param : number
    msglst : any[]

    constructor(conn:any, repbeat?:boolean){
        if(repbeat != true) repbeat = false
        this.repbeat = repbeat
        this.conn = conn
        this.ridx = MESSAGE_IDX_BEGIN
        this.widx = MESSAGE_IDX_BEGIN
        this.headerBuf = Buffer.alloc(12)
        this.currentData = null
        this.header_size = 0
        this.data_size = 0
        this.current_param = 0
        this.msglst = []
    }

    write(data:any){
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
                    this.msglst.push({msg:this.currentData, param:this.current_param})
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
                    this.current_param = this.headerBuf.readUInt32LE(8)
                    if(szmsg < 0 || szmsg > MAX_MESSAGE_SIZE){
                        return -1
                    }
                    if(szmsg == 0){
                        if(this.current_param > 0){
                            this.msglst.push({msg:Buffer.from(''), param:this.current_param})
                        }else{
                            // Heart beat here, ret = 1 means caller should reset alive-check timer
                            if(this.repbeat) this.send()
                            ret = 1
                        }
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

    send(str?:any, param?:number){
        if(param == null) param = 0
        const hdr = Buffer.alloc(12)
        if(str == null){
            hdr.writeInt32LE(this.widx, 0)
            hdr.writeInt32LE(0, 4)
            hdr.writeUInt32LE(param, 8)
            this.conn.send(hdr)
        }else{
            const data = Buffer.from(str)
            hdr.writeInt32LE(this.widx, 0)
            hdr.writeInt32LE(data.byteLength, 4)
            hdr.writeUInt32LE(param, 8)
            this.widx = (this.widx + data.byteLength) % MESSAGE_IDX_TOKEN
            this.conn.send(hdr)
            this.conn.send(data)
        }
    }
}

/**
 * 客户端连接事件处理方法
 * @param cli 新连上的连接对象
 */
type ClientConnectionProc = (cli:Client) => void

 /**
  * 客户端关闭事件处理方法
  * @param cli 被关闭的连接对象
  */
type ClientCloseProc = (cli:Client) => void
 
 /**
  * 客户端消息事件处理方法
  * @param data 消息数据
  * @param cli 相关的连接对象
  */
type ClientMessageProc = (msg:any, cli:Client) => void

/**
 * 客户端远程过程调用事件处理方法
 * @param data 消息数据
 * @param rpcid 调用ID
 * @param cli 相关的连接对象
 */
type ClientRpcProc = (msg:any, rpcid:number, cli:Client) => void

type ClientConfig = {
    url?:string,
    options?:object
    timeout?: number,
    on?:{
        conn?:ClientConnectionProc
        close?:ClientCloseProc
        msg?:ClientMessageProc
        rpc?:ClientRpcProc
    }
}

/**
 * CS 客户端对象
 */
 export class Client{

    /** @internal */ [K_CS_ON_CON] : ClientConnectionProc
    /** @internal */ [K_CS_ON_CLO] : ClientCloseProc
    /** @internal */ [K_CS_ON_MSG] : ClientMessageProc
    /** @internal */ [K_CS_ON_RPC] : ClientRpcProc
    /** @internal */ [K_CS_DEF_URL]: string
    /** @internal */ [K_CS_DEF_OPT]: any
    /** @internal */ [K_CS_TIMEOUT] : number
    /** @internal */ [K_RPC_MAP] : any
    /** @internal */ [K_RPC_ID] : number
    /** @internal */ [K_CS_PCL] : any
    /** @internal */ [K_CS_TWAIT] : number
    /** @internal */ [K_CS_CON] : WebSocket | null
    /** @internal */ [K_CS_TW] : any

    [key:string]:any
    
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
    constructor(cfg:ClientConfig){
        this[K_CS_ON_CON] = ()=>{}
        this[K_CS_ON_CLO] = ()=>{}
        this[K_CS_ON_MSG] = ()=>{}
        this[K_CS_ON_RPC] = ()=>{}
        this[K_CS_TIMEOUT] = 120
        this[K_RPC_MAP] = {}
        this[K_RPC_ID] = 1
        this[K_CS_DEF_URL] = ''
        this[K_CS_DEF_OPT] = null
        this[K_CS_PCL] = null
        this[K_CS_TWAIT] = 0
        this[K_CS_CON] = null
        this[K_CS_TW] = null
        if(cfg){
            if(cfg.on){
                if(cfg.on.conn) this[K_CS_ON_CON] = cfg.on.conn
                if(cfg.on.close) this[K_CS_ON_CLO] = cfg.on.close
                if(cfg.on.msg) this[K_CS_ON_MSG] = cfg.on.msg
                if(cfg.on.rpc) this[K_CS_ON_RPC] = cfg.on.rpc
            }
            if(cfg.url) this[K_CS_DEF_URL] = cfg.url
            if(cfg.options) this[K_CS_DEF_OPT] = cfg.options
            if(cfg.timeout != null) this[K_CS_TIMEOUT] = cfg.timeout
        }
    }

    /**
     * 连接事件处理方法
     */
     set connectionProc(p:ClientConnectionProc){
        this[K_CS_ON_CON] = p
    }

    /**
     * 关闭事件处理方法
     */
    set closeProc(p:ClientCloseProc){
        this[K_CS_ON_CLO] = p
    }

    /**
     * 消息事件处理方法
     */
    set messageProc(p:ClientMessageProc){
        this[K_CS_ON_MSG] = p
    }

    /**
     * 远程过程调用事件处理方法
     */
    set rpcProc(p:ClientRpcProc){
        this[K_CS_ON_RPC] = p
    }

    /**
     * 连接状态
     */
    get status(){ return this[K_CS_PCL] != null}

    /**
     * 连接到服务端
     * @param url 服务端URL
     * @param opt WebSocket 选项
     */
    open(url?:string, opt?:object):void{
        this.close()
        if(!url) url = this[K_CS_DEF_URL]
        this[K_CS_TWAIT] = 0
        this[K_CS_CON] =  new WebSocket(url, Object.assign({}, opt, this[K_CS_DEF_OPT]))
        this[K_CS_CON].onclose = this[K_CS_CLO_PROC].bind(this)
        this[K_CS_CON].onerror = this[K_CS_CLO_PROC].bind(this)
        this[K_CS_CON].onmessage = this[K_CS_MSG_PROC].bind(this)
        this[K_CS_TW] = setInterval(this[K_CS_TWP2].bind(this), 100)
    }

    /**
     * 断开连接
     */
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
            this[K_CS_CON].close()
            this[K_CS_CON] = null
            this[K_CS_ON_CLO](this)
            for(let i in this[K_RPC_MAP])
                this[K_RPC_MAP][i].j()
            this[K_RPC_MAP] = {}
        }
    }

    /**
     * 发送消息
     * @param msg 要发送的消息
     */
    send(msg:any){
        if(this[K_CS_PCL]) this[K_CS_PCL].send(msg)
    }

    /**
     * 发起远程过程调用
     * @param msg 请求消息
     */
    async rpc(msg:any):Promise<any>{
        if(this[K_CS_PCL]){
            return new Promise((function(this:Client, r:any, j:any){
                while(this[K_RPC_ID] in this[K_RPC_MAP]) this[K_RPC_ID] = (this[K_RPC_ID] + 1) % 0xfffff0
                this[K_RPC_MAP][this[K_RPC_ID]] = {r:r,j:j}
                this[K_CS_PCL].send(msg, this[K_RPC_ID] + 1)
            }).bind(this))
        }else throw 'Not Connected'
    }

    /**
     * 响应远程过程调用
     * @param msg 返回消息
     * @param rpcid 调用ID
     */
    endRpc(msg:any, rpcid:number):void{
        if(this[K_CS_PCL]){
            this[K_CS_PCL].send(msg, rpcid)
        }
    }

    /** @internal */
    [K_CS_MSG_PROC](ev:any){
        const ret = this[K_CS_PCL].write(ev.data)
        if(ret >= 0){
            const msgs = this[K_CS_PCL].read()
            for(let m of msgs){
                try{
                    if(m.param == 0){
                        this[K_CS_ON_MSG](m.msg, this)
                    }else{
                        if((m.param & 0x40000000) > 0){
                            const id = (m.param - 1) & 0xffffff
                            if(id in this[K_RPC_MAP]){
                                this[K_RPC_MAP][id].r(m.msg)
                                delete this[K_RPC_MAP][id]
                            }
                        }else{
                            this[K_CS_ON_RPC](m.msg, m.param | 0x40000000, this)
                        }
                    }
                }catch(e){console.log(e)}
                if(this[K_CS_PCL] == null) return
            }
            if(ret == 1)
                this[K_CS_TWAIT] = 0
        }else
            this.close()
    }

    /** @internal */
    [K_CS_CLO_PROC](ev:any){
        this.close()
    }

    /** @internal */
    [K_CS_TWP](){
        if(++this[K_CS_TWAIT]>3)
            this.close()
        else
            this[K_CS_PCL].send()
    }

    /** @internal */
    [K_CS_TWP2](){
        if(!this[K_CS_TW] || !this[K_CS_CON]) return
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

export class Conn{
    [K_CS_CON_WS] : any
    [K_CS_CON_SRV] : Server
    [K_CS_CLI_ADDR] : string
    [K_RPC_MAP] : any
    [K_RPC_ID] : number

    [key:string]:any

    /** @internal */
    constructor(ws:any, clientAddr:string, srv:Server){
        this[K_CS_CON_WS] = ws
        this[K_CS_CON_SRV] = srv
        this[K_CS_CLI_ADDR] = clientAddr
        this[K_RPC_MAP] = {}
        this[K_RPC_ID] = 1
    }

    get clientAddress(){ return this[K_CS_CLI_ADDR] }

    close(){
        this[K_CS_CON_SRV].close(this)
    }

    send(data:any){
        this[K_CS_CON_SRV].send(this, data)
    }

    async rpc(msg:any):Promise<any>{
        return this[K_CS_CON_SRV].rpc(this, msg);
    }

    endRpc(msg:any, rpcid:number):void{
        this[K_CS_CON_SRV].endRpc(this, msg, rpcid)
    }
}

declare type ServerConfig = {
    app:any,
    path:string,
    timeout?: number,
    on?:{
        conn?:ConnectionProc
        close?:CloseProc
        msg?:MessageProc
        rpc?:RpcProc
    }
}

/**
 * 连接事件处理方法
 * @param conn 新连上的连接对象
 * @param srv 服务对象
 */
 type ConnectionProc = (conn:Conn, srv:Server) => void

 /**
  * 关闭事件处理方法
  * @param conn 被关闭的连接对象
  * @param srv 服务对象
  */
 type CloseProc = (conn:Conn, srv:Server) => void
 
 /**
  * 消息事件处理方法
  * @param msg 消息
  * @param conn 相关的连接对象
  * @param srv 服务对象
  */
 type MessageProc = (msg:Buffer, conn:Conn, srv:Server) => void
 
 /**
  * 客户端远程过程调用事件处理方法
  * @param data 消息数据
  * @param rpcid 调用ID
  * @param cli 相关的连接对象
  */
  type RpcProc = (msg:Buffer, rpcid:number, conn:Conn, srv:Server) => void

declare type ServerConfig = {
    app:any,
    path:string,
    timeout?: number,
    on?:{
        conn?:ConnectionProc
        close?:CloseProc
        msg?:MessageProc
        rpc?:RpcProc
    }
}

/**
 * CS 服务端对象
 */
export class Server{

    /** @internal */ [K_CS_ON_CON] : ConnectionProc
    /** @internal */ [K_CS_ON_CLO] : CloseProc
    /** @internal */ [K_CS_ON_MSG] : MessageProc
    /** @internal */ [K_CS_ON_RPC] : RpcProc
    /** @internal */ [K_CS_TW] : any

    [key:string]:any

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
    constructor(cfg: ServerConfig){
        const c = {
            timeout: 120,
        }
        syncObject(c, cfg)
        this[K_CS_ON_CON] = ()=>{}
        this[K_CS_ON_CLO] = ()=>{}
        this[K_CS_ON_MSG] = ()=>{}
        this[K_CS_ON_RPC] = ()=>{}

        if(c.timeout)
            this[K_CS_TW] = new TimeWheel(2000, c.timeout / 2, this[K_CS_TWP].bind(this));
        if(cfg){
            if(cfg.app && cfg.path) this.bind(cfg.app, cfg.path)
            if(cfg.on){
                if(cfg.on.conn) this.connectionProc = cfg.on.conn
                if(cfg.on.close) this.closeProc = cfg.on.close
                if(cfg.on.msg) this.messageProc = cfg.on.msg
                if(cfg.on.rpc) this.rpcProc = cfg.on.rpc
            }
        }
    }

    /**
     * 绑定到 App 对象
     * @param {App.Server} app app对象
     * @param {string} path 监听路径
     */
     bind(app:any, path:string):void{
        app.WS(path, this[K_CS_ENTRY], this)
        if(this[K_CS_TW]) this[K_CS_TW].start()
    }

    /**
     * 连接事件处理方法
     */
     set connectionProc(p:ConnectionProc){
        this[K_CS_ON_CON] = p
    }

    /**
     * 关闭事件处理方法
     */
    set closeProc(p:CloseProc){
        this[K_CS_ON_CLO] = p
    }

    /**
     * 消息事件处理方法
     */
    set messageProc(p:MessageProc){
        this[K_CS_ON_MSG] = p
    }

    set rpcProc(p:RpcProc){
        this[K_CS_ON_RPC] = p
    }

    /**
     * 关闭连接
     * @param {object} conn 连接对象
     */
    close(conn:any):void{
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
            for(let i in conn.ifc[K_RPC_MAP])
                conn.ifc[K_RPC_MAP][i].j()
            conn.ifc[K_RPC_MAP] = {}
        }
    }
    
    /**
     * 发送数据
     * @param {object} conn 连接对象
     * @param {any} data 要发送的数据
     */
     send(conn:any, data:any):void{
        if(conn[K_CS_CON_WS])
            this.send(conn[K_CS_CON_WS], data)
        else
            if(conn.cs) conn.cs.send(data)
    }

    /**
     * 发起远程过程调用
     * @param conn 连接对象
     * @param msg 请求消息
     */
    rpc(conn:Conn, msg:any):Promise<any>{
        if(conn[K_CS_CON_WS].cs){
            return new Promise((r,j)=>{
                while(conn[K_RPC_ID] in conn[K_RPC_MAP]) conn[K_RPC_ID] = (conn[K_RPC_ID] + 1) % 0xfffff0
                conn[K_RPC_MAP][conn[K_RPC_ID]] = {r:r,j:j}
                conn[K_CS_CON_WS].cs.send(msg, conn[K_RPC_ID] + 1)
            })
        }throw 'Not connect yet'
    }

    /**
      * 响应远程过程调用
      * @param conn 连接对象
      * @param msg 返回消息
      * @param rpcid 调用ID
      */
    endRpc(conn:Conn, msg:any, rpcid:number):void{
        if(conn[K_CS_CON_WS].cs){
            conn[K_CS_CON_WS].cs.send(msg, rpcid)
        }
    }

    /** @internal */
    [K_CS_ENTRY](req:any, ws:any, app:any){
        ws.cs = new Protocol(ws, true)
        ws.onmessage = this[K_CS_MSG_PROC].bind(this)
        ws.onclose = ws.onerror = this[K_CS_CLO_PROC].bind(this)
        ws.ifc = new Conn(ws, req.clientAddress, this)
        if(this[K_CS_TW]) ws.twid = this[K_CS_TW].join(ws)
        try{
            this[K_CS_ON_CON](ws.ifc, this)
        }catch(e){console.log(e)}
    }

    /** @internal */
    [K_CS_TWP](idx:any, obj:any, wh:any){
        this.close(obj)
    }

    /** @internal */
    [K_CS_MSG_PROC](ev:any){
        const ret = ev.target.cs.write(ev.data)
        if(ret >= 0){
            const msgs = ev.target.cs.read()
            for(let m of msgs){
                try{
                    if(m.param == 0){
                        this[K_CS_ON_MSG](m.msg, ev.target.ifc, this)
                    }else{
                        if((m.param & 0x40000000) > 0){
                            const id = (m.param - 1) & 0xffffff
                            if(id in ev.target.ifc[K_RPC_MAP]){
                                ev.target.ifc[K_RPC_MAP][id].r(m.msg)
                                delete ev.target.ifc[K_RPC_MAP][id]
                            }
                        }else{
                            this[K_CS_ON_RPC](m.msg, m.param | 0x40000000, ev.target.ifc, this)
                        }
                    }              
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

    /** @internal */
    [K_CS_CLO_PROC](ev:any){
        this.close(ev.target)
    }
}
