// import { IOptions, Result } from '..'
// import { Context, RecursivePartial } from '../types'
// import { run } from '../vm/go-vm/svml-machine-go'
import { Instruction } from '../vm/go-vm/svml-constants'
import { parse } from '../go-slang/index'
import {
  ConstStatement,
  GoAction,
  GoLiteral,
  Identifier,
  VarStatement,
  BlockStatement,
  SeqStatement,
  UnaryExpression,
  BinaryExpression,
  AssignmentExpression,
  CondStatement,
  WhileStatement,
  LogicalExpression,
  FunctionStatement,
  CallExpression,
  ReturnStatement,
  GoroutineStatement,
  DeferStatement,
  SendChStatement,
  ReceiveChExpression,
  ForStatement
} from '../go-slang/types'
import { run } from '../vm/go-vm/svml-machine-go'

// export async function goRunner(
//   code: string,
//   context: Context,
//   options: RecursivePartial<IOptions> = {}
// ): Promise<Result> {
//   return Promise.resolve({
//     status: 'finished',
//     context,
//     value: code
//   })
// }

const builtins = [
  'print',
  'sleep',
  'Add',
  'Wait',
  'Done',
  'Lock',
  'Unlock',
  'intchannel',
  'stringchannel'
]

const constants = {}

const builtin_compile_frame: string[] = builtins
const constant_compile_frame: string[] = Object.keys(constants)
const global_compile_environment: string[][] = [builtin_compile_frame, constant_compile_frame]

const push = (array: any, ...items: any) => {
  // fixed by Liew Zhao Wei, see Discussion 5
  for (const item of items) {
    array.push(item)
  }
  return array
}

// modified to exclude seq
// function scan_for_locals(comp: GoAction[]): string[] {
//   const tags: string[] = ['var', 'const', 'func']
//   const locals: string[] = []
//   for (let i = 0; i < comp.length; i++) {
//     const c = comp[i] as unknown as VarStatement | ConstStatement | FunctionStatement
//     if (tags.includes(c.tag)) {
//       locals.push(c.sym.sym)
//     }
//   }
//   return locals
// }

function scan_for_locals(comp: GoAction): string[] {
  return comp.tag === 'seq'
    ? comp.stmts.reduce((acc: string[], x) => acc.concat(scan_for_locals(x)), [])
    : comp.tag == 'var' || comp.tag == 'const' || comp.tag == 'func'
    ? [comp.sym.sym]
    : comp.tag == 'for'
    ? [comp.init.sym.sym]
    : []
}

function extract_params(params: Identifier[]): string[] {
  return params.map(p => p.sym)
}

function has_locals(comp: GoAction[]): boolean {
  const tags: string[] = ['var', 'const', 'func', 'for']
  return comp.some(c => tags.includes(c.tag))
}

function compile_sequence(seq: GoAction[], ce: string[][]) {
  if (seq.length === 0) {
    instrs[wc++] = { tag: 'LDC', val: undefined }
    return
  }
  let first = true
  for (const comp of seq) {
    first ? (first = false) : (instrs[wc++] = { tag: 'POP' })
    compile(comp, ce)
  }
}

const compile_time_environment_extend = (vs: any, e: any) => {
  //  make shallow copy of e
  return push([...e], vs)
}

function compile_time_environment_position(env: string[][], x: string): [number, number] {
  let frame_index = env.length
  while (value_index(env[--frame_index], x) === -1) {}
  return [frame_index, value_index(env[frame_index], x)]
}

function value_index(frame: string[], x: string): number {
  for (let i = 0; i < frame.length; i++) {
    if (frame[i] === x) return i
  }
  return -1
}

let wc: number
let instrs: Instruction[]

function set_blk_seq(comp: GoAction): GoAction {
  if (comp.tag == 'blkseq') {
    if (has_locals(comp.body)) {
      if (comp.body.length == 1) {
        return { tag: 'blk', body: comp.body[0] }
      } else {
        // length > 1
        return { tag: 'blk', body: { tag: 'seq', stmts: comp.body } }
      }
    } else {
      if (comp.body.length == 0) {
        return { tag: 'seq', stmts: [] }
      } else if (comp.body.length == 1) {
        return set_blk_seq(comp.body[0])
      } else {
        return { tag: 'seq', stmts: comp.body }
      }
    }
  }
  return comp
}

// export function compile_program(program: GoAction) {
//   wc = 0
//   instrs = []

//   const locals: string[] = scan_for_locals(program)
//   const env = compile_time_environment_extend(locals, global_compile_environment)

//   instrs[wc++] = { tag: 'ENTER_SCOPE', num: locals.length }
//   for (let i = 0; i < program.length; i++) {
//     const comp: GoStatement = program[i]
//     compile(comp, env)
//   }
//   instrs[wc++] = { tag: 'EXIT_SCOPE' }
//   instrs[wc] = { tag: 'DONE' }
// }

export function compile_program(program: GoAction) {
  wc = 0
  instrs = []
  compile(program, global_compile_environment)
  instrs[wc] = { tag: 'DONE' }
}

function compile(comp: GoAction, ce: string[][]) {
  if (comp != null) {
    comp = set_blk_seq(comp)
    compile_comp[comp.tag](comp, ce)
  }
}

// function compile_body(comp: GoAction[], ce: string[][]) {
//   for (let i = 0; i < comp.length; i++) {
//     const c: GoAction = comp[i]
//     compile(c, ce)
//   }
// }

const compile_comp = {
  lit: (comp: GoLiteral, ce: string[][]) => {
    instrs[wc++] = { tag: 'LDC', val: comp.val }
  },
  nam:
    // store precomputed position information in LD instruction
    (comp: Identifier, ce: string[][]) => {
      // differentiate compilation of method invocation on an object
      // lets just hard code for now to take any dots as one of the few types
      // and an ordinary LD
      if (comp.sym.includes('.')) {
        // If it has a '.', assume it is one of the few methods we support
        const [obj_sym, obj_method] = comp.sym.split('.')
        instrs[wc++] = {
          tag: 'LDM',
          sym: obj_sym,
          method_pos: compile_time_environment_position(ce, obj_method),
          pos: compile_time_environment_position(ce, obj_sym)
        }
      } else {
        // As per normal
        instrs[wc++] = {
          tag: 'LD',
          sym: comp.sym,
          pos: compile_time_environment_position(ce, comp.sym)
        }
      }
    },
  unop: (comp: UnaryExpression, ce: string[][]) => {
    compile(comp.arg, ce)
    instrs[wc++] = { tag: 'UNOP', sym: comp.sym }
  },
  binop: (comp: BinaryExpression, ce: string[][]) => {
    compile(comp.first, ce)
    compile(comp.second, ce)
    instrs[wc++] = { tag: 'BINOP', sym: comp.sym }
  },
  log: (comp: LogicalExpression, ce: string[][]) => {
    compile(comp.first, ce)
    compile(comp.second, ce)
    instrs[wc++] = { tag: 'LOGOP', sym: comp.sym }
  },
  cond: (comp: CondStatement, ce: string[][]) => {
    compile(comp.pred, ce)
    const jump_on_false_instruction = { tag: 'JOF', addr: 0 }
    instrs[wc++] = jump_on_false_instruction
    compile(comp.cons, ce)
    const goto_instruction = { tag: 'GOTO', addr: 0 }
    instrs[wc++] = goto_instruction
    const alternative_address = wc
    jump_on_false_instruction.addr = alternative_address
    compile(comp.alt, ce)
    goto_instruction.addr = wc
  },
  while: (comp: WhileStatement, ce: string[][]) => {
    const loop_start = wc
    compile(comp.pred, ce)
    const jump_on_false_instruction = { tag: 'JOF', addr: 0 }
    instrs[wc++] = jump_on_false_instruction
    compile(comp.body, ce)
    instrs[wc++] = { tag: 'POP' }
    instrs[wc++] = { tag: 'GOTO', addr: loop_start }
    jump_on_false_instruction.addr = wc
    instrs[wc++] = { tag: 'LDC', val: undefined }
  },
  for: (comp: ForStatement, ce: string[][]) => {
    compile(comp.init, ce)
    instrs[wc++] = { tag: 'POP' }
    const loop_start = wc
    instrs[wc++] = { tag: 'POP' }
    compile(comp.pred, ce)
    const jump_on_false_instruction = { tag: 'JOF', addr: 0 }
    instrs[wc++] = jump_on_false_instruction
    compile(comp.body, ce)
    instrs[wc++] = { tag: 'POP' }
    compile(comp.update, ce)
    instrs[wc++] = { tag: 'GOTO', addr: loop_start }
    jump_on_false_instruction.addr = wc
    instrs[wc++] = { tag: 'LDC', val: undefined }
  },
  app: (comp: CallExpression, ce: string[][]) => {
    compile(comp.fun, ce)
    for (const arg of comp.args) {
      compile(arg, ce)
    }
    instrs[wc++] = { tag: 'CALL', arity: comp.args.length }
  },
  assmt:
    // store precomputed position info in ASSIGN instruction
    (comp: AssignmentExpression, ce: string[][]) => {
      compile(comp.expr, ce)
      instrs[wc++] = { tag: 'ASSIGN', pos: compile_time_environment_position(ce, comp.sym.sym) }
    },
  seq: (comp: SeqStatement, ce: string[][]) => compile_sequence(comp.stmts, ce),
  blk: (comp: BlockStatement, ce: string[][]) => {
    const locals = scan_for_locals(comp.body)
    instrs[wc++] = { tag: 'ENTER_SCOPE', num: locals.length }
    compile(
      comp.body,
      // extend compile-time environment
      compile_time_environment_extend(locals, ce)
    )
    instrs[wc++] = { tag: 'EXIT_SCOPE' }
  },
  var: (comp: VarStatement, ce: string[][]) => {
    compile(comp.expr, ce)
    // If of type WaitGroup or Mutex, need to do a ALLOCATE instr that
    // creates memory for the WG/Mutex on the heap and push onto OS then ASSIGN will peek the OS
    // and set the addr to the WG/Mutex in the environment
    if (comp.sym.type === 'WaitGroup' || comp.sym.type === 'Mutex') {
      instrs[wc++] = { tag: 'ALLOCATE', type: comp.sym.type }
    }
    instrs[wc++] = { tag: 'ASSIGN', pos: compile_time_environment_position(ce, comp.sym.sym) }
  },
  const: (comp: ConstStatement, ce: string[][]) => {
    compile(comp.expr, ce)
    instrs[wc++] = { tag: 'ASSIGN', pos: compile_time_environment_position(ce, comp.sym.sym) }
  },
  ret: (comp: ReturnStatement, ce: string[][]) => {
    compile(comp.expr, ce)
    if (comp.expr.tag === 'app') {
      // tail call: turn CALL into TAILCALL
      instrs[wc - 1].tag = 'TAIL_CALL'
    } else {
      instrs[wc++] = { tag: 'RESET' }
    }
  },
  func: (comp: FunctionStatement, ce: string[][]) => {
    instrs[wc++] = { tag: 'LDF', arity: comp.prms.length, addr: wc + 1 }
    // jump over the body of the lambda expression
    const goto_instruction = { tag: 'GOTO', addr: 0 }
    instrs[wc++] = goto_instruction
    // extend compile-time environment
    compile(comp.body, compile_time_environment_extend(extract_params(comp.prms), ce))
    instrs[wc++] = { tag: 'LDC', val: undefined }
    instrs[wc++] = { tag: 'RESET' }
    goto_instruction.addr = wc

    instrs[wc++] = { tag: 'ASSIGN', pos: compile_time_environment_position(ce, comp.sym.sym) }
  },
  goroutine: (comp: GoroutineStatement, ce: string[][]) => {
    compile(comp.expr.fun, ce)
    for (const arg of comp.expr.args) {
      compile(arg, ce)
    }
    instrs[wc++] = { tag: 'START_THREAD', arity: comp.expr.args.length }
  },
  def: (comp: DeferStatement, ce: string[][]) => {
    compile(comp.expr.fun, ce)
    for (const arg of comp.expr.args) {
      compile(arg, ce)
    }
    instrs[wc++] = { tag: 'DEFER', arity: comp.expr.args.length }
  },
  sendCh: (comp: SendChStatement, ce: string[][]) => {
    compile(comp.expr, ce)
    instrs[wc++] = {
      tag: 'SEND',
      pos: compile_time_environment_position(ce, comp.sym.sym),
      addr: wc - 1 // point address to self
    }
  },
  receiveCh: (comp: ReceiveChExpression, ce: string[][]) => {
    instrs[wc++] = {
      tag: 'RECEIVE',
      pos: compile_time_environment_position(ce, comp.sym.sym),
      addr: wc - 1
    }
  }
}

// const wg_testcode = `
// var wg WaitGroup

// func test(x, time) {
//   defer wg.Done()
//   sleep(time)
//   print(x)
// }

// wg.Add(3)

// go test("1", 10)

// go test("2", 100)

// go test("3", 50)

// wg.Wait()
// `

// const mutex_testcode = `
// var mut Mutex
// var wg WaitGroup
// var bal int = 100

// wg.Add(2)

// func test1(x, time) {
//   defer wg.Done()
//   mut.Lock()
//   sleep(time)
//   if bal > 0 {
//     bal = bal - x
//   }
//   print(bal)
//   mut.Unlock()
// }

// go test1(60, 200)
// go test1(70, 100)

// wg.Wait()
// print("done")
// `

// const defer_testcode = `
// func c(d) {
//   print(d + 1)
// }

// func f(a, b) {
//   defer c(a)
//   defer c(b)
//   return b
// }
// a := 1
// a = f(3, 6)
// print(a)
// `

// use a := make(chan int) to need receiver ready before able to send
const channel_testcode = `
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

// const loop_testcode = `
// for i := 0; i < 3; i++{
//   print(i)
// }
// `

compile_program(parse(channel_testcode))
printInstr()

function printInstr() {
  // for (let i = 0; i < instrs.length; i++) {
  //   console.log(instrs[i])
  // }
  console.log(run(1000, instrs))
}
