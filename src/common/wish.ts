const kWaitingQueue = Symbol()

declare type ResolveFunc = (val:unknown)=>void
declare type RejectFunc = (reason?:any)=>void

/** 等待对象 */
export class Wish{
    /** @internal */ private [kWaitingQueue]:Array<ResolveFunc>

    constructor(){
        this[kWaitingQueue] = []
    }

    /** 异步等待 */
    async wait(){
        return new Promise((r:ResolveFunc, j:RejectFunc)=>{this[kWaitingQueue].push(r)})
    }

    /** 终止所有等待 */
    reach(val?:unknown){
        for(let r of this[kWaitingQueue]) r(val)
        this[kWaitingQueue].length = 0
    }
}