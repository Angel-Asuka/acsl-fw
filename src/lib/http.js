'use strict'

/*
    HTTP 模块
*/

import axios from 'axios'
import WebSocket from 'ws'


export async function Get(url, param, headers, exdata) {
    return new Promise((resolve)=>{
        axios.get(url, {params:param, headers:headers}).then(response => {
            resolve(exdata?response:response.data)
        }).catch(error => {
            console.log(error)
            resolve(null)
        })
    });
}

export async function Post(url, data, headers, exdata) {
    return new Promise((resolve)=>{
        axios.post(url, data, headers?{headers:headers}:null).then(response => {
            resolve(exdata?response:response.data)
        }).catch(error => {
            console.log(error)
            resolve(null)
        })
    });
}

export async function Connect(url, options){
    const s = new WebSocket(url, options)
    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            if(ws.readyState === 1) {
                clearInterval(timer)
                resolve(ws);
            }
        }, 10);
    });
}