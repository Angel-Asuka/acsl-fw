import fs from 'node:fs'

const K_TEMPLATE_ROOT = Symbol()
const K_TEMPLATE_CACHE = Symbol()
const K_TEMPLATE_BEGIN_MARK = Symbol()
const K_TEMPLATE_END_MARK = Symbol()

export type TemplateConfig = {
    root?: string,
    begin_mark?: string,
    end_mark?: string
}

declare type TemplateCacheObject = {
    res : Array<string>,
    func : (res:Array<string>, data:any, incfunc:(fn:string, data:any)=>string)=>string,
    lastUpdate : number
}

function compile(name:string, lupd:number, str:string, bm:string, em:string){
    let res = [] as Array<string>
    let src = 'let ___output = ""; const print=function(){for(let v of arguments) ___output += v;}\nconst include=function(p,d){print(___inc___(p,d));}\n'
    let s = str

    while(s.length){

        // 查找脚本起始标记
        const p0 = s.search(bm);
        if(p0 == -1){
            // 后续不存在更多的脚本，直接输出剩余文本
            src += `print(res[${res.length}]);\n`
            res.push(s);
            break;
        }
        if(p0){
            // 脚本前面还有文本，先输出文本
            src += `print(res[${res.length}]);\n`
            res.push(s.substring(0, p0))
        }
        // 转到脚本起始位置
        s = s.substring(p0 + bm.length)
        // 查找脚本结束标记
        const p1 = s.search(em)
        if(p1 == -1){
            // 脚本错误，不完整的脚本
            console.log('TEMPLATE COMPILE FAILED, SYNTAX ERROR, UNCOMPLETE SCRIPT')
            return null
        }

        let subscript = s.substring(0, p1);
        if(subscript[0] == '=')
            subscript = 'print(' + subscript.substring(1) + ')'

        // 合并当前脚本
        src += subscript
        src += '\n'

        // 移动指针
        s = s.substring(p1 + em.length)

    }

    src += "return ___output; "

    return {
        res : res,
        func : new Function('res', 'data', '___inc___', src),
        lastUpdate : lupd
    } as TemplateCacheObject
}

export class Template{
    /** @internal */ private [K_TEMPLATE_CACHE]: {[key:string]:TemplateCacheObject}
    /** @internal */ private [K_TEMPLATE_BEGIN_MARK]: string
    /** @internal */ private [K_TEMPLATE_END_MARK]: string
    /** @internal */ private [K_TEMPLATE_ROOT]: string

    constructor(cfg?:TemplateConfig) {
        this[K_TEMPLATE_CACHE] = {}
        this[K_TEMPLATE_BEGIN_MARK] = '<!--{'
        this[K_TEMPLATE_END_MARK] = '}-->'
        this[K_TEMPLATE_ROOT] = ""
        if(cfg) this.set(cfg)
    }

    set(cfg:TemplateConfig, root?:string){
        // CFG - 模板目录
        if(cfg.root){
            this[K_TEMPLATE_ROOT] = (root || '') + cfg.root
            if(this[K_TEMPLATE_ROOT][this[K_TEMPLATE_ROOT].length-1] != '/') this[K_TEMPLATE_ROOT] += '/'
        }
        // CFG - 起始标记
        if(cfg.begin_mark) this[K_TEMPLATE_BEGIN_MARK] = cfg.begin_mark
        // CFG - 结束标记
        if(cfg.end_mark) this[K_TEMPLATE_END_MARK] = cfg.end_mark
    }

    makeCache(fn:string) {
        try{
            const fpath = this[K_TEMPLATE_ROOT] + fn;
            const fstat = fs.statSync(fpath)
            const fcontent = fs.readFileSync(fpath, 'utf-8')
            if(!(fn in this[K_TEMPLATE_CACHE]) || this[K_TEMPLATE_CACHE][fn].lastUpdate < fstat.mtimeMs){
                const tpl = compile(fn, fstat.mtimeMs, fcontent, this[K_TEMPLATE_BEGIN_MARK], this[K_TEMPLATE_END_MARK])
                if(!tpl) return false;
                this[K_TEMPLATE_CACHE][fn] = tpl
            }
            return true
        }catch(e){
            console.log(e);
            return false
        }
    }

    render(fn:string, data:any):string {
        if(this.makeCache(fn)){
            const proc = this[K_TEMPLATE_CACHE][fn]
            return proc.func(proc.res, data, this.render.bind(this))
        }
        return ""
    }
    
}