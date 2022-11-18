declare type Func = (...args:any[])=>any

const __initializeList = [] as Array<Func>

interface HtmlHelper {
    (a?:string|Func,...args:any[]):any
}

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

window.onload = async (e:any)=>{
    for(let p of __initializeList)
        await p()
}