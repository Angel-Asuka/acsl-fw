
export const Http = {
    // 发起一个 Http 请求
    //      url = 目标URL
    //      method = HTTP请i去方法 'GET' 或 'POST'
    //      data = 要发送的数据（body）
    //      ondownloading = 下行进度回调函数
    //      onuploading = 上行进度回调函数
    //      stad = 传入下行进度回调函数的附加参数
    //      stau = 传入上行进度回调函数的附加参数
    //  返回
    //      成功返回远程服务器返回的数据，失败返回 null
    req: async (url:string, method:string, data?:any, header?:any, exData?:boolean, ondownloading?:(l:number, t:number, s:any)=>void, onuploading?:(l:number, t:number, s:any)=>void, stad?:any, stau?:any)=>{
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
                    if(exData == true)
                        resolve(xhr)
                    else if (xhr.status == 200){
                        let ret = xhr.response;
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

    // GET请求
    get: async (url:string, param?:any, header?:any, exData?:boolean, ondownloading?:(l:number, t:number, s:any)=>void, onuploading?:(l:number, t:number, s:any)=>void, stad?:any, stau?:any)=>{
        if(param){
            const p = [] as Array<string>;
            for(let k in param) p.push(`${encodeURI(k)}=${encodeURI(param[k])}`);
            url += `?${p.join('&')}`;
        }
        return await Http.req(url, 'GET', null, header, exData, ondownloading, onuploading, stad, stau);
    },

    // POST请求
    post: async (url:string, data?:any, header?:any, exData?:boolean, ondownloading?:(l:number, t:number, s:any)=>void, onuploading?:(l:number, t:number, s:any)=>void, stad?:any, stau?:any)=>{
        if(!header) header = {}
        if(typeof(data)=='object'){
            data = JSON.stringify(data)
            if(!header['content-type'])
                header['content-type'] = 'application/json'
        }
        return await(Http.req(url, 'POST', data, header, exData, ondownloading, onuploading, stad, stau));
    }
}

export async function get(url:string, param?:any, headers?:any, exdata?:boolean):Promise<any> {
    return Http.get(url, param, headers, exdata)
}

export async function post(url:string, data?:any, headers?:any, exdata?:boolean):Promise<any> {
    return Http.post(url, data, headers, exdata)
}

export async function Connect(url:string, options?:any):Promise<WebSocket>{
    const ws = new WebSocket(url)
    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            if(ws.readyState === 1) {
                clearInterval(timer)
                resolve(ws);
            }
        }, 10);
    });
}