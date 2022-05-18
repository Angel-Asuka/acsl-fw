'use strict'

/**
 * langley service framework
 * class Template
 * cfg = {
 *      root : '模板文件目录',
 *      begin_mark : '【可选】模板脚本起始标记，默认为<!--{',
 *      end_mark : '【可选】模板脚本结束标记，默认为}-->'
 * }
 * 
 */

const fs = require('fs')
const K_TEMPLATE_CFG = Symbol()
const K_TEMPLATE_CACHE = Symbol()
const K_TEMPLATE_BEGIN_MARK = Symbol()
const K_TEMPLATE_END_MARK = Symbol()

function compile(name, lupd, str, bm, em){
    let res = []
    let src = 'module.exports=(res, data, ___inc___)=>{let ___output = ""; const print=function(){for(let v of arguments) ___output += v;}\nconst include=function(p,d){print(___inc___(p,d));}\n'
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
            res.push(s.substr(0, p0))
        }
        // 转到脚本起始位置
        s = s.substr(p0 + bm.length)
        // 查找脚本结束标记
        const p1 = s.search(em)
        if(p1 == -1){
            // 脚本错误，不完整的脚本
            console.log('TEMPLATE COMPILE FAILED, SYNTAX ERROR, UNCOMPLETE SCRIPT')
            return null
        }

        let subscript = s.substr(0, p1);
        if(subscript[0] == '=')
            subscript = 'print(' + subscript.substr(1) + ')'

        // 合并当前脚本
        src += subscript
        src += '\n'

        // 移动指针
        s = s.substr(p1 + em.length)

    }

    src += "return ___output; }"
    const m = new module.constructor();
    m._compile(src, name);

    return {
        res : res,
        func : m.exports,
        lastUpdate : lupd
    }
}

module.exports = (__l)=>{return class {
    constructor(cfg) {
        this.Langley = __l
        this[K_TEMPLATE_CFG] = cfg
        this[K_TEMPLATE_CACHE] = {}
        // CFG - 模板目录
        if(this[K_TEMPLATE_CFG].root[this[K_TEMPLATE_CFG].root.length-1] != '/')
            this[K_TEMPLATE_CFG].root += '/'
        // CFG - 起始标记
        if(this[K_TEMPLATE_CFG].begin_mark)
            this[K_TEMPLATE_BEGIN_MARK] = this[K_TEMPLATE_CFG].begin_mark
        else
            this[K_TEMPLATE_BEGIN_MARK] = '<!--{'
        // CFG - 结束标记
        if(this[K_TEMPLATE_CFG].end_mark)
            this[K_TEMPLATE_END_MARK] = this[K_TEMPLATE_CFG].end_mark
        else
            this[K_TEMPLATE_END_MARK] = '}-->'
    }

    makeCache(fn) {
        try{
            const fpath = this[K_TEMPLATE_CFG].root + fn;
            const fstat = fs.statSync(fpath)
            const fcontent = fs.readFileSync(fpath, 'utf-8')
            if(!(fn in this[K_TEMPLATE_CACHE]) || this[K_TEMPLATE_CACHE][fn].lastUpdate < fstat.mtimeMs){
                this[K_TEMPLATE_CACHE][fn] = compile(fn, fstat.mtimeMs, fcontent, this[K_TEMPLATE_BEGIN_MARK], this[K_TEMPLATE_END_MARK])
            }
            return true
        }catch(e){
            console.log(e);
            return false
        }
    }

    render(fn, data) {
        if(this.makeCache(fn)){
            const proc = this[K_TEMPLATE_CACHE][fn]
            return proc.func(proc.res, data, this.render.bind(this))
        }
        return ""
    }
    
}}