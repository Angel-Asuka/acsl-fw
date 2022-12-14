const K_TIMEWHEEL_WHEEL = Symbol()
const K_TIMEWHEEL_POINTER = Symbol()
const K_TIMEWHEEL_UNIT = Symbol()
const K_TIMEWHEEL_CB = Symbol()
const K_TIMEWHEEL_ID = Symbol()
const K_TIMEWHEEL_PROC = Symbol()
const K_TIMEWHEEL_UDATA = Symbol()

const K_TIMEWHEEL_WRAPPER_BID = Symbol()
const K_TIMEWHEEL_WRAPPER_AID = Symbol()
const K_TIMEWHEEL_WRAPPER_OBJ = Symbol()

export type TimeWhellItem = {
    /** @internal */ [K_TIMEWHEEL_WRAPPER_BID]: number,
    /** @internal */ [K_TIMEWHEEL_WRAPPER_AID]: number,
    /** @internal */ [K_TIMEWHEEL_WRAPPER_OBJ]: any
}
declare type TimeWheelCallBack = (idx:TimeWhellItem, obj:any, wheel:TimeWheel)=>void

/**
 * 时间轮
 */
export class TimeWheel{
    /** @internal */ [K_TIMEWHEEL_POINTER]:number
    /** @internal */ [K_TIMEWHEEL_UNIT]:number
    /** @internal */ [K_TIMEWHEEL_CB]:TimeWheelCallBack
    /** @internal */ [K_TIMEWHEEL_WHEEL]:Array<Array<TimeWhellItem>>
    /** @internal */ [K_TIMEWHEEL_UDATA]:any
    /** @internal */ [K_TIMEWHEEL_ID]:any

    /**
     * 构造一个时间轮
     * @param unit 单位事件长度（毫秒）
     * @param size 时间轮长度
     * @param cb 回调函数
     * @param udata 用户数据
     * @example
     * 下面的代码中：
     *      idx = 对象在时间轮中的ID
     *      obj = 对象
     *      wheel = 时间轮对象，等同于 tw
     * 
     * const tw = new TimeWheel(2000,30,(idx, obj, wheel)=>{
     *      ...
     * },null)
     */
    constructor(unit:number, size:number, cb:TimeWheelCallBack, udata?:any){
        this[K_TIMEWHEEL_WHEEL] = []
        this[K_TIMEWHEEL_POINTER] = 0
        this[K_TIMEWHEEL_UNIT] = unit
        this[K_TIMEWHEEL_CB] = cb
        this[K_TIMEWHEEL_ID] = null
        this[K_TIMEWHEEL_UDATA] = udata
        for(let i=0; i<size; ++i) this[K_TIMEWHEEL_WHEEL].push([])
    }

    /**
     * 启动时间轮
     */
    start():void{
        this.stop()
        this[K_TIMEWHEEL_ID] = setInterval(this[K_TIMEWHEEL_PROC].bind(this), this[K_TIMEWHEEL_UNIT])
    }

    /**
     * 停止时间轮
     */
    stop():void{
        if(this[K_TIMEWHEEL_ID] != null){
            clearInterval(this[K_TIMEWHEEL_ID])
            this[K_TIMEWHEEL_ID] = null
        }
    }

    /**
     * 将对象插入时间轮
     * @param obj 对象
     * @param toffset 时间偏移，默认为 -1
     * @returns 对象在时间轮中的ID
     */
    join(obj:any, toffset?:number):TimeWhellItem{
        if(toffset == null) toffset = -1
        const bid = (this[K_TIMEWHEEL_POINTER] + this[K_TIMEWHEEL_WHEEL].length + toffset) % this[K_TIMEWHEEL_WHEEL].length
        const aid = this[K_TIMEWHEEL_WHEEL][bid].length
        const o = {
            [K_TIMEWHEEL_WRAPPER_BID]: bid,
            [K_TIMEWHEEL_WRAPPER_AID]: aid,
            [K_TIMEWHEEL_WRAPPER_OBJ]: obj
        }
        this[K_TIMEWHEEL_WHEEL][bid][aid] = o
        return o
    }
    
    /**
     * 从时间轮中删除一个对象
     * @param o 对象在时间轮中的ID
     */
    remove(o:TimeWhellItem):void{
        const bid = o[K_TIMEWHEEL_WRAPPER_BID]
        const aid = o[K_TIMEWHEEL_WRAPPER_AID]
        if(bid >= 0 && aid >= 0 && this[K_TIMEWHEEL_WHEEL][bid].length > 0){
            if(this[K_TIMEWHEEL_WHEEL][bid].length > aid + 1){
                this[K_TIMEWHEEL_WHEEL][bid][aid] = this[K_TIMEWHEEL_WHEEL][bid][this[K_TIMEWHEEL_WHEEL][bid].length - 1]
                this[K_TIMEWHEEL_WHEEL][bid][aid][K_TIMEWHEEL_WRAPPER_AID] = aid
            }
            this[K_TIMEWHEEL_WHEEL][bid].length--
        }
        o[K_TIMEWHEEL_WRAPPER_BID] = o[K_TIMEWHEEL_WRAPPER_AID] = -1
    }

    /**
     * 用户数据
     */
    get data(){ return this[K_TIMEWHEEL_UDATA] }

    /**
     * 用户数据
     */
    set data(d){ this[K_TIMEWHEEL_UDATA] = d }

    [K_TIMEWHEEL_PROC](){
        const objs = Array.from(this[K_TIMEWHEEL_WHEEL][this[K_TIMEWHEEL_POINTER]])
        for(let i=objs.length-1; i>=0; --i){
            this[K_TIMEWHEEL_CB](objs[i], objs[i][K_TIMEWHEEL_WRAPPER_OBJ], this);
        }
        this[K_TIMEWHEEL_POINTER] = (this[K_TIMEWHEEL_POINTER] + 1) % this[K_TIMEWHEEL_WHEEL].length
    }
}