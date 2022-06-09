'use strict'

/*
    HTTP 模块
*/

const axios = require('axios')

module.exports = (__l)=>{return new class {
    constructor(cfg) {
        this.Langley = __l
    }

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

}}