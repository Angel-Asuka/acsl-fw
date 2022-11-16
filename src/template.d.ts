export type TemplateConfig = {
    root?: string,
    begin_mark?: string,
    end_mark?: string
}

export class Template{
    constructor(cfg?:TemplateConfig)
    set(cfg: TemplateConfig, root?:string):void
    /**
     * 渲染一个模板文件
     * @param fn 模板文件名（相对于 AppConfig.template）
     * @param data 用户数据，模板中可以通过 data 来访问
     */
    render(fn:string, data?:object):string
}