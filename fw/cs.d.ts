declare type App = import('./app').App

/**
 * 连接事件处理方法
 * @param conn 新连上的连接对象
 */
type ConnectionProc = (conn:Connection) => void

/**
 * 关闭事件处理方法
 * @param conn 被关闭的连接对象
 */
type CloseProc = (conn:Connection) => void

/**
 * 消息事件处理方法
 * @param msg 消息
 * @param data 消息数据
 * @param conn 相关的连接对象
 */
type MessageProc = (msg:string, data:object|null, conn:Connection) => void

/**
 * 连接对象
 */
export class Connection{
    constructor(ws:object)
}

type ServerConfig = {
    app:App,
    path:string,
    on?:{
        conn?:ConnectionProc
        close?:CloseProc
        msg?:MessageProc
    }
}

/**
 * CS 服务端组件
 */
export class Server{
    constructor(cfg?:ServerConfig)
    bind(app:App, path:string):void
    set connectionProc(p:ConnectionProc)
    set closeProc(p:CloseProc)
    set messageProc(p:MessageProc)
}
