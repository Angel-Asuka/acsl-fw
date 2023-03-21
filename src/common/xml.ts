
const _reg_xmltag = /<\s*([^\s\t\[>]+)/

export enum Type {
    Null        = 0,
    Element     = 1,
    Text        = 2,
    CData       = 3,
    Declare     = 4
}

export class XML {
    /** @internal */ private _type : Type = Type.Null
    /** @internal */ private _name : string = ''
    /** @internal */ private _attributes : {[key:string]:string} = {}
    /** @internal */ private _children : Array<XML> | null = null
    /** @internal */ private _string : string | null = null
    /** @internal */ private _reststr : string | null = null

    private constructor(name:string, reststr:string){
        if(name[0] == '?'){
            this._type = Type.Declare
            this._name = name.substring(1)
        }else if(name[0] == '!'){
            this._type = Type.CData
            this._name = name.substring(1)
        }
    }

    static parse(xml:string){
        const tag = _reg_xmltag.exec(xml)
        if(!tag) return null
        return new XML(tag[1], xml.substring(tag[0].length))
    }
}