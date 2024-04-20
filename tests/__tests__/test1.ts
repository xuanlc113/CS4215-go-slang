import { createEmptyContext } from "../../src/createContext"
import { go_parse } from "../../src/go-slang"
import { compile_program } from "../../src/runner/goRunner"
import { Chapter, Variant } from "../../src/types"
import { run } from "../../src/vm/go-vm/svml-machine-go"



test('dummy test', () => {
    const prog = `
    print("hello")
    `

    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("hello")


})

test('mutex go routines', () => {
    const prog = `
    var mut Mutex
    var wg WaitGroup
    var bal int = 100
    
    wg.Add(2)
    
    func test1(x, time) {
      defer wg.Done()
      mut.Lock()
      sleep(time)
      if bal > 0 {
        bal = bal - x
      }
      print(bal)
      mut.Unlock()
    }
    
    go test1(60, 100)
    go test1(70, 200)
    
    wg.Wait()
    print("done")
    
    `

    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("40")
    expect(logSpy).toHaveBeenCalledWith("-30")
    expect(logSpy).toHaveBeenCalledWith("done")
})

test('mutex goroutines', () => {
    const prog = `
    var mut Mutex
    var wg WaitGroup
    var bal int = 100
    
    wg.Add(2)
    
    func test1(x, time) {
      defer wg.Done()
      mut.Lock()
      sleep(time)
      if bal > 0 {
        bal = bal - x
      }
      print(bal)
      mut.Unlock()
    }
    
    go test1(60, 200)
    go test1(70, 100)
    
    wg.Wait()
    print("done")
    
    `

    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("40")
    expect(logSpy).toHaveBeenCalledWith("-30")
    expect(logSpy).toHaveBeenCalledWith("done")
})

test('no mutex goroutines', () => {
    const prog = `
    var wg WaitGroup
    var bal int = 100
    
    wg.Add(2)
    
    func test1(x) {
      defer wg.Done()
      if bal > 0 {
        bal = bal - x
        bal = bal - x
      }
      print(bal)
    }
    
    go test1(60)
    go test1(70)
    
    print(bal)
    
    wg.Wait()
    print("done")
    `
    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("100")
    expect(logSpy).toHaveBeenCalledWith("-30")
    expect(logSpy).toHaveBeenCalledWith("-100")
    expect(logSpy).toHaveBeenCalledWith("done")
})

test('while loop', () => {
    const prog = `
    func f(x int) int {
        return x + 3
    }
    var i int = 0
    while i < 5 {
        print(f(i))
        i = i + 2
    }
    `
    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("3")
    expect(logSpy).toHaveBeenCalledWith("5")
    expect(logSpy).toHaveBeenCalledWith("7")
})

test('defer mutex waitgroup', () => {
    const prog = `
    var mut Mutex
    var wg WaitGroup
    var bal int = 100
    
    wg.Add(2)
    
    func test(x int) {
        if x > 5 {
            return 5
        }
        return 100
    }
    
    func test1(x, time) {
      defer wg.Done()
      mut.Lock()
      sleep(time)
    
      defer print(test(5))
    
      if bal > 0 {
        bal = bal - x
      }
      print(bal)
      mut.Unlock()
    }
    
    go test1(test(10), 100)
    go test1(test(1), 200)
    
    wg.Wait()
    print("done")
    
    `
    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("95")
    expect(logSpy).toHaveBeenCalledWith("100")
    expect(logSpy).toHaveBeenCalledWith("done")
})

test('while loop break continue', () => {
    const prog = `
    func f(x int) int {
        return x + 3
    }
    var i int = 0
    while i < 15 {
        if i == 10 {
            break
        }
        if i == 2 {
            i = i + 2
            continue
        }	
        print(f(i))
        i = i + 2
    }
    `
    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("3")
    expect(logSpy).toHaveBeenCalledWith("7")
    expect(logSpy).toHaveBeenCalledWith("9")
    expect(logSpy).toHaveBeenCalledWith("11")
})

test('buffered channel', () => {
    const prog = `
    func f() {
        sleep(5)
        print("sleep done")
        print(<- a)
      }
      
      a := make(chan int, 1)
      go f()
      a <- 234
      print("sent")
      sleep(10)
    `
    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("sent")
    expect(logSpy).toHaveBeenCalledWith("sleep done")
    expect(logSpy).toHaveBeenCalledWith("234")
})

test('unbuffered channel', () => {
    const prog = `
    func f() {
        sleep(5)
        print("sleep done")
        print(<- a)
      }
      
      a := make(chan int)
      go f()
      a <- 234
      print("sent")
      sleep(10)
    `
    const logSpy = jest.spyOn(global.console, 'log')

    const context = createEmptyContext(Chapter.GO_1, Variant.DEFAULT, [])
    const instrs = compile_program(go_parse(prog))
    run(10000, instrs, context)

    expect(logSpy).toHaveBeenCalledWith("sent")
    expect(logSpy).toHaveBeenCalledWith("sleep done")
    expect(logSpy).toHaveBeenCalledWith("234")
})