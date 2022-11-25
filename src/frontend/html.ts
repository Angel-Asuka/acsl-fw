export * from './animator.js'
export * from './event-proc.js'

import {EventProc} from './event-proc.js'

declare type Func = (...args:any[])=>any
declare type BuildOptions = {allowUnderlineKeyForId?:boolean}

interface HtmlHelper {
    (a?:string|Func|object,...args:any[]):any
    build(tpl:any, root?:any, options?:BuildOptions): any
}

const DefaultBuildOptions = {
    allowUnderlineKeyForId: true
}

const __initializeList = [] as Array<Func>
const __elementInitList = [] as Array<CustomElementBase>

export class CustomElementBase extends HTMLElement {
    constructor(){
        super()
    }

    onInitElement(){}
}

export const $ = <HtmlHelper>function(a:string|Func|object,...args:any[]){
    if(typeof a === 'string'){
        if(a[0] == '!'){
            const e = document.createElement(a.substring(1)) as CustomElementBase
            if(e['onInitElement']) e['onInitElement']()
            return e
        }else if(a[0] == '@'){
            return document.getElementsByTagName(a.substring(1))
        }else
            return document.getElementById(a)
    } else if(typeof a === 'function') {
        if(document.readyState == 'complete')
            (a as Func)()
        else
            __initializeList.push(a as Func)
    } else if(typeof a === 'object'){
        return $.build(a, ...args)
    }
}

// 注入页面加载完成的入口
window.addEventListener('load', async (e:any)=>{
    for(let e of __elementInitList)
        e.onInitElement()
    for(let p of __initializeList)
        await p()
})

/**
 * 根据模板构造 DOM 树
 * @param tpl 模板对象
 * @param root 根对象，用于存放带有ID的HTML节点对象的引用
 * @param options 选项
 * @returns 构造出来的 DOM 树
 */
$.build = function(tpl:any, root?:any, options?:BuildOptions): HTMLElement | Text{
    if(typeof tpl === 'string')
        return document.createTextNode(tpl)

    let keyTag = '_'
    if(options == null) options = DefaultBuildOptions
    if(options.allowUnderlineKeyForId){
        for(let k in tpl){
            if(k[0] == '_'){
                keyTag = k
                break;
            }
        }
    }
    const e = document.createElement((keyTag in tpl)?tpl[keyTag]:'div')
    if(!root) root = e
    if(keyTag != '_') root[keyTag] = e
    for(let k in tpl){
        switch(k){
            case keyTag:
                break;
            case 'style':
                for(let s in tpl[k]) e.style[s] = tpl[k][s]
                break;
            case 'class':
                if(typeof tpl[k] === 'string')
                    e.className = tpl[k]
                else if(typeof tpl[k] === 'object' && tpl[k].constructor == Array)
                    e.classList.add(...tpl[k])
                break;
            case 'child':
                for(let c of tpl[k]) e.appendChild($.build(c, root, options))
                break;
            case 'id':
                root[tpl[k]] = e
                e.id = tpl[k]
                break;
            default:
                e[k] = tpl[k]
        }
    }
    if(e.onInitElement) e.onInitElement()
    return e
}

export enum LogicalPos {
    First       = -1,
    Current     = 0,
    Last        = 1
}

declare global {
    interface Node {
        /** 在节点层级中上升 */
        rise():void
        /** 在节点层级中上升到顶端 */
        riseToTop():void
        /** 在节点层级中下沉 */
        sink():void
        /** 在节点层级中下沉到底部 */
        sinkToBottom():void
        /** 从当前节点层级中移除 */
        break():void
        /** 判断当前节点是否是 n 的父辈 */
        isParentOf(n:Node):boolean
        /** 判断当前节点是否是 n 的子辈 */
        isChildOf(n:Node):boolean
        /** 移除所有子节点 */
        removeAllChild():void
    }

    interface Element {
        /** @internal */ [kShowAnimation]:Animation | null
        /** @internal */ [kHideAnimation]:Animation | null
        /** @internal */ [kLogicalParent]:Element | null
        /** @internal */ [kLogicalSibling]:Element | null
        /** 呈现动画 */
        get showAnimation():Animation | null
        set showAnimation(ani: Animation | null)
        /** 隐藏动画 */
        get hideAnimation():Animation | null
        set hideAnimation(ani: Animation | null)
        /** 逻辑父级 */
        get logicalParent(): Element
        set logicalParent(e: Element)
        /** 呈现 */
        show(p?:Element, pos?: LogicalPos, prevSibling?:Element):Promise<void> | void
        /** 隐藏 */
        hide():Promise<void>
    }
}

Element.prototype.rise = function(){
    if(this.nextSibling){
        const s = this.nextSibling
        this.break()
        s.after(this)
    }
}

Element.prototype.riseToTop = function(){
    if(this.parentNode && this.nextSibling){
        const p = this.parentNode
        this.break()
        p.appendChild(this)
    }
}

Element.prototype.sink = function(){
    if(this.previousSibling){
        const s = this.previousSibling
        this.break()
        s.before(this)
    }
}

Element.prototype.sinkToBottom = function(){
    if(this.parentNode && this.previousSibling){
        const p = this.parentNode
        this.break()
        p.firstChild?.before(this)
    }
}

Element.prototype.break = function(){
    if(this.parentNode) this.parentNode.removeChild(this)
}

Element.prototype.isParentOf = function(n:Node){
    let p:Node|null = n.parentNode
    while(p){
        if(p == this) return true
        p = p.parentNode
    }
    return false
}

Element.prototype.isChildOf = function(n:Node) {
    return n.isParentOf(this)
}

Element.prototype.removeAllChild = function(){
    while(this.firstChild) this.removeChild(this.firstChild)
}

const kShowAnimation = Symbol()
const kHideAnimation = Symbol()
const kLogicalParent = Symbol()
const kLogicalSibling = Symbol()

Object.defineProperty(Element.prototype, 'showAnimation', {
    get() {return this[kShowAnimation]},
    set(ani: Animation | null) { this[kShowAnimation] = ani }
})

Object.defineProperty(Element.prototype, 'hideAnimation', {
    get() {return this[kHideAnimation]},
    set(ani: Animation | null) { this[kHideAnimation] = ani }
})

Object.defineProperty(Element.prototype, 'logicalParent', {
    get() {return this[kLogicalParent]},
    set(ele: Element | null) { this[kLogicalParent] = ele }
})

Element.prototype.show = async function(p?:Element, pos?: LogicalPos, prevSibling?:Element){
    if(p) this.logicalParent = p
    if(prevSibling) this[kLogicalSibling] = prevSibling
    if(pos == null) pos = LogicalPos.Last
    if(this[kLogicalParent] == null) this[kLogicalParent] = document.body
    switch(pos){
        case LogicalPos.First:
            if(this[kLogicalParent].firstElementChild){
                this[kLogicalParent].firstElementChild.before(this)
            }else
                this[kLogicalParent].appendChild(this)
            this[kLogicalSibling] = null
            break;
        case LogicalPos.Current:
            if(this[kLogicalSibling]){
                this[kLogicalSibling].after(this)
                break;
            }
        case LogicalPos.Last:
            this[kLogicalParent].appendChild(this)
            this[kLogicalSibling] = this.previousElementSibling
            break;
    }
    if(this[kShowAnimation]){
        this[kShowAnimation].play()
        return this[kShowAnimation].wait()
    }
}

Element.prototype.hide = async function(){
    if(this.parentElement){
        if(this[kHideAnimation]){
            this[kHideAnimation].play()
            await this[kHideAnimation].wait()
        }
        this[kLogicalParent] = this.parentElement
        this[kLogicalSibling] = this.previousElementSibling
        this.break()
    }
}