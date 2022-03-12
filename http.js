'use strict'

/*
    HTTP 模块
*/

const axios = require('axios')

module.exports = (__l)=>{return class {
    constructor(cfg) {
        this.Langley = __l
    }

    async get(url, param) {
        return new Promise((resolve)=>{
            axios.get(url, param).then(response => {
                resolve(response.data)
            }).catch(error => {
                resolve(null)
            })
        });
    }

}}