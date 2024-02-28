import * as peggy from 'peggy'
import * as fs from 'fs'
import * as path from 'path'

const PEG_FILE: string = path.join(path.resolve(__dirname, '.'), 'golang.pegjs')
const pegContent = fs.readFileSync(PEG_FILE, 'utf-8')

const parser = peggy.generate(pegContent)

const code = `
go f("ters", i)
func fact(n string, i int) int {
    return 1, true
}
fact(1)
var a;
const b int = 1
var ab_12-3 = -1;
a = 1+1;
a += 1
while true {
    1
    if a < b {
        continue
    } else if b == c {
        break
    } else {
        break
    }
}
f(a, b)
var Ab = f(a)
`
const tree = parser.parse(code)
// console.log(JSON.stringify(tree))
console.log(JSON.stringify(tree, null, 2))
