/*
    Langley 浏览器端框架
*/

;(()=>{

//#region Http工具
const Http = {
    //#region 发起一个 Http 请求
    //      url = 目标URL
    //      method = HTTP请i去方法 'GET' 或 'POST'
    //      data = 要发送的数据（body）
    //      ondownloading = 下行进度回调函数
    //      onuploading = 上行进度回调函数
    //      stad = 传入下行进度回调函数的附加参数
    //      stau = 传入上行进度回调函数的附加参数
    //  返回
    //      成功返回远程服务器返回的数据，失败返回 null
    req: async (url, method, data, header, ondownloading,  onuploading, stad, stau)=>{
        return new Promise((resolve)=>{
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            if(header){
                for(let hdr in header){
                    xhr.setRequestHeader(hdr,header[hdr]);
                }
            }
            if(ondownloading) xhr.onprogress = e=>{ ondownloading(e.loaded, e.total, stad); }
            if(onuploading) xhr.upload.onprogress = e=>{ onuploading(e.loaded, e.total, stau); }
            xhr.onreadystatechange = () => {
                if (xhr.readyState == XMLHttpRequest.DONE) {
                    if (xhr.status == 200){
                        let ret = xhr.response;
                        try{
                            ret = JSON.parse(ret)
                        }catch(e){}
                        resolve(ret);
                    }else{
                        console.log(xhr.status);
                        resolve(null);
                    }
                }
            }
            xhr.send(data);
        })
    },
    //#endregion
    //#region GET请求
    get: async (url, param, header,  ondownloading,  onuploading, stad, stau)=>{
        if(param){
            const p = [];
            for(let k in param) p.push(`${encodeURI(k)}=${encodeURI(param[k])}`);
            url += `?${p.join('&')}`;
        }
        return await Http.req(url, 'GET', null, header, ondownloading, onuploading, stad, stau);
    },
    //#endregion
    //#region POST请求
    post: async (url, data, header, ondownloading, onuploading, stad, stau)=>{
        if(!header) header = {}
        if(typeof(data)=='object'){
            data = JSON.stringify(data)
            if(!header['content-type'])
                header['content-type'] = 'application/json'
        }
        return await(Http.req(url, 'POST', data, header, ondownloading, onuploading, stad, stau));
    }
    //#endregion
}
//#endregion


//#region Global Utils
window.isArray = (o)=>{return (typeof(o)=='object' && o.__proto__.constructor == Array)}
window.isInstanceOf = (i, c)=>{
    if(typeof(i) != 'object') return false
    i = i.__proto__
    while(i){
        if(i.constructor == c) return true
        i = i.__proto__
    }
    return false
}
//#endregion

//#region Array.insert
Array.prototype.insert = function(v, i){
    if(i == null || i < 0 || i > this.length)
        i = this.length
    return this.slice(0, i).concat([v]).concat(this.slice(i))
}
//#endregion

//#region Node.break
Node.prototype.break = function(){
    if (this.parentElement) this.parentElement.removeChild(this);
}
//#endregion

//#region Element.show/hide
HTMLElement.prototype.show = function(){
    if(this.__parent)
        this.__parent.appendChild(this)
    else
        document.body.appendChild(this)
}

HTMLElement.prototype.hide = function(){
    this.__parent = this.parentElement
    this.break()
}
//#endregion

//#region Element.scanId
HTMLElement.prototype.scan = function(key, p){
    if(!key) key = 'id'
    if(!p) p = this
    let i = this.firstElementChild
    while (i != null) {
        const xid = i.getAttribute(key)
        if(xid) p[xid] = i
        i.scan(key, p)
        i = i.nextElementSibling
    }
}
//#endregion

//#region Node.removeAllChildren
Node.prototype.removeAllChildren = function(){
    const arr = []
    while(this.firstChild){
        arr.push(this.firstChild)
        this.removeChild(this.firstChild)
    }
    return arr
}
//#endregion

//#region Element.removeAllElementChildren
HTMLElement.prototype.removeAllElementChildren = function(){
    const arr = []
    while(this.firstElementChild){
        arr.push(this.firstElementChild)
        this.removeChild(this.firstElementChild)
    }
    return arr
}
//#endregion

const K_LANGLEY_ENTRY = Symbol()
const K_LANGLEY_INIT_LIST = Symbol()

window.Langley = {
    Http: Http,

    build: function(def, root){
        if(!def.tag) def.tag = 'div'
        const ele = document.createElement(def.tag)
        if(!root) root = ele
        for(let k in def){
            if(k == 'style')
                for(let s in def[k]) ele.style[s] = def[k][s]
            else if(k == 'children')
                for(let c of def[k]) ele.appendChild(window.Langley.build(c, root))
            else if(k == 'xid')
                root[def[k]] = ele
            else
                ele[k] = def[k]
        }
        return ele
    }
}

/*
特别函数 $
用法：
    $('x') = 查找 id=x 的元素 document.getElementById('x')
    $('@x') = 查找标签为 x 的所有元素 document.getElementsByTagName('x')
    $('!x', opt) = 构造一个标签为 x 的元素，可以使用可选的 opt 来设置新标签的参数，详见 Langley.build 的说明
                   额外地，此处的 opt 中可以指定两个额外的参数：
                        root    = 等同于 Langley.build 中的 root 参数
                        parent  = 如果设置，将会自动把新构造的元素添加为 parent 的子元素
    $(e) = 将 e 加入元素初始化队列。e 必须为 HTMLElement 的一个实例，初始化时会调用e.init()。
    $(o, root) = o 为一个对象，等同于调用 Langley.build(o, root)
*/
window.$ = (p, o)=>{
    if(typeof(p) == 'function'){
        if(!window.Langley[K_LANGLEY_ENTRY])    
            window.Langley[K_LANGLEY_ENTRY] = []
        window.Langley[K_LANGLEY_ENTRY].push(p)
    }else if(typeof(p) == 'string'){
        if(p[0] == '!'){
            if(o){
                o.tag = p.substring(1)
                const root = o.root
                const parent  = o.parent
                delete o.root
                delete o.parent
                const ele = window.Langley.build(o, root)
                if(parent) parent.appendChild(ele)
                return ele
            }else
                return document.createElement(p.substring(1));
        }else if(p[0] == '@'){
            return document.getElementsByTagName(p.substring(1))
        }else{
            return document.getElementById(p);
        }
    }else if(typeof(p) == 'object'){
        if(isInstanceOf(p, HTMLElement) && p.init){
            if(!window.Langley[K_LANGLEY_INIT_LIST])
                window.Langley[K_LANGLEY_INIT_LIST] = []
            window.Langley[K_LANGLEY_INIT_LIST].push(p)
        }else{
            return window.Langley.build(p, o)
        }
    }
}

window.$.__proto__ = window.Langley;

//#region Entry
window.onload = async (e)=>{
    if(window.Langley[K_LANGLEY_INIT_LIST]){
        for(let p of window.Langley[K_LANGLEY_INIT_LIST]){
            if(p.init) await p.init()
        }
    }

    if(window.Langley[K_LANGLEY_ENTRY]){
        for(let p of window.Langley[K_LANGLEY_ENTRY])
            await p()
    }
}
//#endregion

})()