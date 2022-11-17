const __text_encoder = new TextEncoder()
const __text_decoder = new TextDecoder()

export class Buffer{
    buf: ArrayBuffer

    constructor(sz:any){
        if(typeof sz == 'number')
            this.buf = new ArrayBuffer(sz)
        else if(typeof(sz) == 'string')
            this.buf = __text_encoder.encode(sz).buffer
        else if(typeof(sz) == 'object' && sz.constructor == ArrayBuffer)
            this.buf = sz
        else
            this.buf = new ArrayBuffer(0)

    }

    toString():string{
        return __text_decoder.decode(this.buf)
    }

    copy(target:Buffer, pos:number , i:number, t:number){
        const a = new Uint8Array(target.buf, pos)
        const b = new Uint8Array(this.buf, i, t - i)
        a.set(b)
    }

    readInt32LE(pos:number){
        const dv = new DataView(this.buf)
        return dv.getInt32(pos, true)
    }

    readUInt32LE(pos:number){
        const dv = new DataView(this.buf)
        return dv.getUint32(pos, true)
    }

    writeInt32LE(v:number, pos:number){
        const dv = new DataView(this.buf)
        dv.setInt32(pos, v, true)
    }

    writeUInt32LE(v:number, pos:number){
        const dv = new DataView(this.buf)
        dv.setUint32(pos, v, true)
    }

    get byteLength() { return this.buf.byteLength }

    static alloc(sz:number):Buffer{
        return new Buffer(sz)
    }

    static async from(obj:any):Promise<Buffer>{
        if(typeof obj == 'object' && obj.constructor == Blob)
            return new Buffer(await obj.arrayBuffer())
        else
            return new Buffer(obj)
    }
}