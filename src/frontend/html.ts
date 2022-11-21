declare type Func = (...args:any[])=>any
declare type BuildOptions = {allowUnderlineKeyForId?:boolean}

interface HtmlHelper {
    (a?:string|Func,...args:any[]):any
    build(tpl:any, root?:any, options?:BuildOptions): any
}

const DefaultBuildOptions = {
    allowUnderlineKeyForId: true
}

const __initializeList = [] as Array<Func>

export const $ = <HtmlHelper>function(a:string|Func,...args:any[]){
    if(typeof a === 'string'){
        if(a[0] == '!'){
            return document.createElement(a.substring(1))
        }else if(a[0] == '@'){
            return document.getElementsByTagName(a.substring(1))
        }else
            return document.getElementById(a)
    } else if(typeof a === 'function') {
        if(document.readyState == 'complete')
            (a as Func)()
        else
            __initializeList.push(a)
    }
}

$.build = function(tpl:any, root?:any, options?:BuildOptions): any{
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
    return e
}

window.onload = async (e:any)=>{
    for(let p of __initializeList)
        await p()
}