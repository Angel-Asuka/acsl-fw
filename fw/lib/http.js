'use strict'

/*
    HTTP 模块
*/

import axios from 'axios'
import WebSocket from 'ws'

class Http{
    constructor() {}

    async get(url, param, headers, exdata) {
        return new Promise((resolve)=>{
            axios.get(url, {params:param, headers:headers}).then(response => {
                resolve(exdata?response:response.data)
            }).catch(error => {
                console.log(error)
                resolve(null)
            })
        });
    }

    async post(url, data, headers, exdata) {
        return new Promise((resolve)=>{
            axios.post(url, data, headers?{headers:headers}:null).then(response => {
                resolve(exdata?response:response.data)
            }).catch(error => {
                console.log(error)
                resolve(null)
            })
        });
    }

    async ws(url){
        const s = new WebSocket(url)
        return new Promise((resolve, reject) => {
            const timer = setInterval(() => {
                if(ws.readyState === 1) {
                    clearInterval(timer)
                    resolve(ws);
                }
            }, 10);
        });
    }

}

const http = new Http()

export {http, Http}