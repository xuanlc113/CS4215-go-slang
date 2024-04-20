import { createEmptyContext } from "../../src/createContext"
import { go_parse } from "../../src/go-slang"
import { compile_program } from "../../src/runner/goRunner"
import { Chapter, Variant } from "../../src/types"
import { run } from "../../src/vm/go-vm/svml-machine-go"



test('test1', () => {
    const prog = `
    print("hello")
    `

    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("", "0: LD print")


})