declare type App = import('./app').Server

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

export type Conn = {
    send(msg:Buffer):void
    close():void
    get clientAddress():string
    rpc(msg:any):Promise<any>
    endRpc(msg:any, rpcid:number):void
    [key:string]:any
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
    /**
     * 构造一个客户端对象
     * @param cfg 配置信息
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
    constructor(cfg:ClientConfig)

    /**
     * 连接事件处理方法
     */
    set connectionProc(p:ClientConnectionProc)

    /**
     * 关闭事件处理方法
     */
    set closeProc(p:ClientCloseProc)

    /**
     * 消息事件处理方法
     */
    set messageProc(p:ClientMessageProc)

    /**
     * 远程过程调用事件处理方法
     */
    set rpcProc(p:ClientRpcProc)

    /**
     * 连接到服务端
     * @param url 服务端URL
     * @param opt WebSocket 选项
     */
    open(url?:string, opt?:object):void

    /**
     * 断开连接
     */
    close():void

    /**
     * 发送消息
     * @param msg 要发送的消息
     */
    send(msg:any):void

    /**
     * 发起远程过程调用
     * @param msg 请求消息
     */
    rpc(msg:any):Promise<any>

    /**
     * 响应远程过程调用
     * @param msg 返回消息
     * @param rpcid 调用ID
     */
    endRpc(msg:any, rpcid:number):void
}

type ServerConfig = {
    app:App,
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
    constructor(cfg?:ServerConfig)

    /**
     * 绑定到 App 对象并监听指定路径上的连接
     * @param app App 对象
     * @param path 连接路径
     */
    bind(app:App, path:string):void

    /**
     * 连接事件处理方法
     */
    set connectionProc(p:ConnectionProc)

    /**
     * 关闭事件处理方法
     */
    set closeProc(p:CloseProc)

    /**
     * 消息事件处理方法
     */
    set messageProc(p:MessageProc)

    /**
     * 远程过程调用事件处理方法
     */
    set rpcProc(p:RpcProc)

    /**
     * 关闭连接
     * @param conn 连接对象
     */
    close(conn:Conn):void

    /**
     * 向连接发送数据
     * @param conn 连接对象
     * @param data 要发送的数据
     */
    send(conn:Conn, data:any):void

    /**
     * 发起远程过程调用
     * @param conn 连接对象
     * @param msg 请求消息
     */
    rpc(conn:Conn, msg:any):Promise<any>

     /**
      * 响应远程过程调用
      * @param conn 连接对象
      * @param msg 返回消息
      * @param rpcid 调用ID
      */
    endRpc(conn:Conn, msg:any, rpcid:number):void
}
