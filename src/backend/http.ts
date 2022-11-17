import axios from 'axios'
import WebSocket from 'ws'

export async function get(url:string, param?:any, headers?:any, exdata?:boolean):Promise<any> {
    return new Promise((resolve)=>{
        axios.get(url, {params:param, headers:headers}).then(response => {
            resolve(exdata?response:response.data)
        }).catch(error => {
            console.log(error)
            resolve(null)
        })
    });
}

export async function post(url:string, data?:any, headers?:any, exdata?:boolean):Promise<any> {
    return new Promise((resolve)=>{
        axios.post(url, data, {headers:headers}).then(response => {
            resolve(exdata?response:response.data)
        }).catch(error => {
            console.log(error)
            resolve(null)
        })
    });
}

export async function connect(url:string, options?:WebSocket.ClientOptions):Promise<WebSocket>{
    const ws = new WebSocket(url, options)
    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            if(ws.readyState === 1) {
                clearInterval(timer)
                resolve(ws);
            }
        }, 10);
    });
}