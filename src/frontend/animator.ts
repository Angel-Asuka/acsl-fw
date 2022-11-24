import { EventProc } from './event-proc.js'
import { Wish, timeStampMS } from './utils.js' 

const kWaitingList = Symbol()
const kDefaultEndWaiter = Symbol()
const kDefaultCancelWaiter = Symbol()
const kOnEndProc = Symbol()

declare global{
    interface Animation {
        /** @internal */ [kWaitingList]: Wish
        /** @internal */ [kDefaultEndWaiter]: EventProc
        /** @internal */ [kDefaultCancelWaiter]: EventProc

        /** @internal */
        [kOnEndProc]():void

        /** 等待动画结束 */
        wait():Promise<any>

    }
}

Animation.prototype.wait = async function(){
    if(this[kWaitingList] == null)
        this[kWaitingList] = new Wish()
    if(this[kDefaultEndWaiter] == null)
        this[kDefaultEndWaiter] = new EventProc(this, 'finish', this[kOnEndProc].bind(this))
    if(this[kDefaultCancelWaiter] == null)
        this[kDefaultCancelWaiter] = new EventProc(this, 'cancel', this[kOnEndProc].bind(this))
    this[kDefaultEndWaiter].active()
    return this[kWaitingList].wait()
}

Animation.prototype[kOnEndProc] = function(){
    if(this[kWaitingList]) this[kWaitingList].reach()
}

export class AnimationTemplate{
    keyframes: Keyframe[]
    options: KeyframeEffectOptions

    constructor(keyframes: Keyframe[], options:KeyframeEffectOptions){
        this.keyframes = keyframes
        this.options = options
    }

    createAnimation(target: Element){
        return new Animation(new KeyframeEffect(target, this.keyframes, this.options))
    }

}

const kPlaying = Symbol()
const kFrameCallBack = Symbol()
const kFrameProc = Symbol()
const kDuration = Symbol()
const kStartTS = Symbol()
const kFramePos = Symbol()
const kWaitingMan = Symbol()
const kDirection = Symbol()
const kLoop = Symbol()
const kRTLen = Symbol()
const kRTDur = Symbol()
const kRTDir = Symbol()
const kTotalLen = Symbol()

export type AnimatorFrameCallBack = (pos:number)=>void
export type AnimatorOptions = {
    duration?: number,                          /* 动画长度（毫秒）*/
    direction?: number[],                       /* 方向数组 */
    loop?: number                               /* 播放次数，0 = 无限 */
}

export class Animator{

    /** @internal */ private [kPlaying]:boolean
    /** @internal */ private [kFrameCallBack]:AnimatorFrameCallBack
    /** @internal */ private [kDuration]:number
    /** @internal */ private [kStartTS]:number
    /** @internal */ private [kFramePos]:number
    /** @internal */ private [kWaitingMan]:Wish
    /** @internal */ private [kDirection]:number[]
    /** @internal */ private [kLoop]:number
    /** @internal */ private [kTotalLen]:number

    constructor(cb: AnimatorFrameCallBack, {duration=1000, direction=[1,-1], loop=1 }:AnimatorOptions = {}){
        this[kPlaying] = false
        this[kFrameCallBack] = cb
        this[kDuration] = duration
        this[kDirection] = direction
        this[kLoop] = loop
        this[kStartTS] = 0
        this[kFramePos] = 0
        this[kWaitingMan] = new Wish()
        this[kTotalLen] = 0
    }

    play(opt?:AnimatorOptions){
        if(opt){
            if(opt.duration != null) this[kDuration] = opt.duration
            if(opt.direction != null) this[kDirection] = opt.direction
            if(opt.loop != null) this[kLoop] = opt.loop 
        }
        if(this[kDirection] == null || this[kDirection].length == 0)
            this[kDirection] = [1,-1]
        this[kTotalLen] = this[kLoop] * this[kDuration]
        if(this[kTotalLen] == 0) this[kTotalLen] = 0xffffffff
        this[kPlaying] = true
        this[kStartTS] = timeStampMS()
        this[kFramePos] = 0
        this[kFrameProc]()
    }

    stop(){
        this[kPlaying] =  false
    }

    async wait(){
        if(this[kPlaying]) return this[kWaitingMan].wait()
    }

    get progress(){
        return this[kFramePos]
    }

    set progress(val:number){
        if(this[kPlaying])
            this[kFramePos] = val
    }

    /** @internal */
    private [kFrameProc](){
        const delta = timeStampMS() - this[kStartTS]                                                    // 动画时间位置
        let times = Math.floor(delta / this[kDuration])                                                 // 当前次数
        let frame = (delta % this[kDuration])                                                           // 逻辑帧号
        if(delta >= this[kTotalLen]){
            this[kPlaying] = false
            frame = this[kDuration]
            times = this[kLoop]-1
        }
        this[kFramePos] = frame * this[kDirection][times % this[kDirection].length] / this[kDuration]   // 动画帧号
        if(this[kFramePos] < 0) this[kFramePos] += 1
        this[kFrameCallBack](this[kFramePos])
        if(this[kPlaying])
            requestAnimationFrame(this[kFrameProc].bind(this))
        else
            this[kWaitingMan].reach()
    }
}