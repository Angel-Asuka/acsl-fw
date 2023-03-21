import fs from 'node:fs'
import process from 'node:process'
import url from "node:url"
import path from "node:path"
import { AcslError } from '@acsl/error'

type TestFunc = ()=>Promise<boolean>
type ModuleExport = {testers:{[key:string]:TestFunc}}

const LINE_WIDTH = 70

function _n(n:number, sz:number):string {
    const s = `                    ${n}`
    return s.substring(s.length - sz)
}

async function main(){
    const root_path = path.dirname(url.fileURLToPath(import.meta.url))
    const testers:Array<{name:string, order:number, func:TestFunc}> = []
    const units = fs.readdirSync(root_path + "/units")
    const modfiles:Array<string> = []
    units.forEach(async (u: string)=>{
        if (u.substring(u.length - 3).toLowerCase() == '.js'){
            const path = `${root_path}/units/${u}`
            modfiles.push(path)
        }
    })

    // Switch current working directory to the root path
    process.chdir(root_path + '/../../test')

    let max_order = 0

    for(let f of modfiles){
        const t:ModuleExport = (await import(f)) as ModuleExport
        if(t && t.testers){
            for(let test in t.testers){
                const p = test.indexOf('|')
                if(p > max_order) max_order = p
                testers.push({name:test.substring(p+1), order: parseInt(test.substring(0,p)), func:t.testers[test]})
            }
        }
    }

    testers.sort((a,b)=>a.order - b.order)

    const tgt = process.argv[2]
    const tgt_order = parseInt(tgt)

    const max_idx = testers.length.toString().length

    let passedCount = 0
    let ignoreCount = 0
    let faultCount = 0

    const spl = '\u001b[2m' + ('-'.repeat(LINE_WIDTH + 8)) + '\u001b[0m'

    console.log(spl)

    for(let i = 0; i < testers.length; ++i){
        const test = testers[i]
        if(tgt && test.name.startsWith(tgt) == false && test.order != tgt_order){
            ignoreCount++
            continue
        }

        let s = `- [${_n(i+1, max_idx)}/${_n(testers.length,max_idx)}] ${_n(test.order, max_order)} ${test.name}`
        s = s.substring(0, LINE_WIDTH - 2) + ' '
        s += '\u001b[2m'
        s += '.'.repeat(LINE_WIDTH - s.length + 4)
        s += '\u001b[0m'
        process.stdout.write(s)
        const v = test.func
        let ret = false
        try{
            ret = await v()
            console.log('[\u001b[1m\u001b[32mPASSED\u001b[0m]')
            passedCount++
        }catch(e){
            console.log('[\u001b[1m\u001b[31mFAILED\u001b[0m]')
            console.log()
            if(e instanceof AcslError){
                if(e.origin){
                    console.log('AcslError: ' + e.message)
                    console.log()
                    console.log(e.origin)
                } else {
                    console.log(e.stack)
                }
            }else{
                console.log(e)
            }
            console.log()
            faultCount++
        } 
    }
    console.log(spl)
    console.log(`Done.`)
    let result = `${testers.length} Tasks, `
    if(passedCount) result += `\u001b[32m${passedCount} Passed, `
    if(faultCount) result += `\u001b[31m${faultCount} Failed, `
    if(ignoreCount) result += `\u001b[33m${ignoreCount} Ignored`
    result += '\u001b[0m'
    console.log(result)
    console.log(spl)
    let excode = 0
    if(faultCount){
        console.log(`\u001b[1m\u001b[31mTest Job Failed.\u001b[0m`)
        excode = 1
    }else{
        console.log(`\u001b[1m\u001b[32mTest Job Passed.\u001b[0m`)
    }
    console.log(spl)
    process.exit(excode)
}

await main();