const DefaultRandomStringDict = '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm'

/**
 * 将任何数据转化为字符串，如果输入的是一个对象，会先按键名对其中的所有元素进行排序，而后按照"键值"的形式组合成字符串
 * @param {Any} data 任意数据
 * @returns 字符串选项
 */
export function stringFromAny(data:any){
    if(typeof data === 'string')
        return data
    else if(typeof data === 'object'){
        const keylst = []
        for(let k in data) keylst.push(k)
        const keysorted = keylst.sort()
        let str = ''
        for(let k of keysorted)
            str += String(k) + String(data[k])
        return str
    }
    data = String(data)
}

/**
 * 通过二进制数据来生成字符串
 * @param src 源数据
 * @param dict 字典
 * @returns 与src等长的字符串
 */
export function generateString(src:ArrayBuffer, dict:string){
    if(!dict) dict=DefaultRandomStringDict
    const buf = [...new Uint8Array(src)]
    let str = ''
    for(let b of buf)
        str += dict[b % dict.length]
    return str
}
