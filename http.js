'use strict'

/*
    HTTP 模块
*/

const axios = require('axios')

module.exports = (__l)=>{return class {
    constructor(cfg) {
        this.Langley = __l
    }

    async get(url, param, headers) {
        return new Promise((resolve)=>{
            axios.get(url, {params:param, headers:headers}).then(response => {
                resolve(response.data)
            }).catch(error => {
                console.log(error)
                resolve(null)
            })
        });
    }

    async post(url, data, headers) {
        return new Promise((resolve)=>{
            axios.post(url, data, headers?{headers:headers}:null).then(response => {
                resolve(response.data)
            }).catch(error => {
                console.log(error)
                resolve(null)
            })
        });
    }

}}