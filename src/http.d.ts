export function Get(url:string, param?:object, headers?:object, exdata?:boolean):Promise<object|null>

export function Post(url:string, data?:object, headers?:object, exdata?:boolean):Promise<object|null>

export function Connect(url:string, options?:object):Promise<object>