declare type EventProcFunction = (ev?:Event)=>void

const kDelegate = Symbol()
const kAbortController = Symbol()
const kTarget = Symbol()
const kEvent = Symbol()
const kOption = Symbol()
const kProc = Symbol()

export enum EventProcStatus{
    Actived = 'ACTIVED',
    Deactived = 'DEACTIVED'
}

/**
 * 事件处理对象
 */
export class EventProc {
    /** @internal */ private [kAbortController]:AbortController | null
    /** @internal */ private [kTarget]:EventTarget
    /** @internal */ private [kEvent]:string
    /** @internal */ private [kOption]:AddEventListenerOptions
    /** @internal */ private [kProc]:EventProcFunction

    /**
     * 构造一个事件监听器
     * @param ele 监听事件的目标
     * @param event 事件
     * @param proc 事件处理函数
     * @param opt 事件监听选项
     */
    constructor(ele: EventTarget, event:string, proc:EventProcFunction, opt?:AddEventListenerOptions){
        this[kTarget] = ele
        this[kAbortController] = null
        this[kEvent] = event
        this[kOption] = {once:false, ...opt}
        this[kProc] = proc
    }

    /** @internal */
    private [kDelegate](ev?: Event){
        this[kProc]()
        if(this[kOption].once){
            if(this[kAbortController])
                this[kAbortController].abort()
            this[kAbortController] = null
        }
    }

    /** 激活 */
    active(){
        if(!this[kAbortController]){
            this[kAbortController] = new AbortController()
            this[kOption].signal = this[kAbortController].signal
            this[kTarget].addEventListener(this[kEvent], this[kDelegate].bind(this), this[kOption])
        }
    }

    /** 关闭 */
    deactive(){
        if(this[kAbortController]){
            this[kAbortController].abort()
            this[kAbortController] = null
        }
    }

    /** 手动触发，对于 option.once = true 的事件处理对象，手动触发也会使其失效 */
    fire(){
        this[kDelegate]()
    }

    /** 当前激活状态 */
    get state(){ return (this[kAbortController]!=null)?EventProcStatus.Actived:EventProcStatus.Deactived }
}