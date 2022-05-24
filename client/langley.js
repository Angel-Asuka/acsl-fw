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
        if(typeof(data)=='object') data = JSON.stringify(data)
        console.log(data)
        return await(Http.req(url, 'POST', data, header, ondownloading, onuploading, stad, stau));
    }
    //#endregion
}
//#endregion

const K_LANGLEY_ENTRY = Symbol()

window.Langley = {
    Http: Http
}

window.$ = (p, o)=>{
    if(typeof(p) == 'function')
        window.Langley[K_LANGLEY_ENTRY] = p;
    else if(typeof(p) == 'string'){
        if(p[0] == '!'){
            const ele = document.createElement(p.substring(1));
            if(o){
                for(let k in o){
                    if(k == 'style')
                        for(s in o[k]) ele.style[s] = o[k][s];
                    else
                        ele[k] = o[k];
                }
            }
            return ele;
        }else{
            return document.getElementById(p);
        }
    }
}

window.$.__proto__ = window.Langley;

//#region Entry
window.onload=(e)=>{
    if(window.Langley[K_LANGLEY_ENTRY]) window.Langley[K_LANGLEY_ENTRY]();
}
//#endregion

})()