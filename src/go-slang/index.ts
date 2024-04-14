// import * as peggy from 'peggy'
// import * as fs from 'fs'
// import * as path from 'path'
import { BlkSeqStatement } from './types'
import { parse } from "./parser"
// const PEG_FILE: string = path.join(path.resolve(__dirname, '.'), 'golang.pegjs')
// const pegContent = fs.readFileSync(PEG_FILE, 'utf-8')
// const parser = peggy.generate(pegContentString)

export function go_parse(code: string): BlkSeqStatement {
  const program: BlkSeqStatement = { tag: 'blkseq', body: parse(code) }
  return program
}

// const code = `
// go f("ters", i)
// func fact(n string, i int) (int, bool) {
//     return 1, true
// }
// fact(1)
// var a;
// const b int = 1
// var ab_12-3 = -1;
// a = 1+1;
// a += 1
// while true {
//     1
//     if a < b {
//         i = 1
//         i = 2
//         continue
//     } else if b == c {
//         break
//     } else {
//         break
//     }
// }
// f(a, b)
// var Ab = f(a)
// `

// const code = `
// for i := 0; i < 3; i++ {
//   print("hi")
// }
// `

// console.log(JSON.stringify(parse(code).body, null, 2))
