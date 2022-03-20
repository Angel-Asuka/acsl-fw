'use strict'

/*
    工具模块
*/

const cp = require('child_process')

module.exports = (__l)=>{return class {
    constructor(cfg) {
        this.Langley = __l
    }

    async shellEx(cmd){
        return new Promise(resolve => {
            cp.exec(cmd, (err, stdo, stde) => {
                if(err)
                    resolve({ok: false, err: stde})
                else
                    resolve({ok: true, data: stdo})
            })
        })
    }

    async shell(cmd){
        const ret = await this.shellEx(cmd)
        if(ret.ok)
            return ret.data
        return null
    }

    get now() {
        return Date.now()
    }

    get ts() {
        return Math.floor(Date.now() / 1000)
    }

    

}}