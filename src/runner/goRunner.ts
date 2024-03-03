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
  AssignmentExpression
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

const builtins = {}

const constants = {}

const builtin_compile_frame: string[] = Object.keys(builtins)
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
    : []
}

function has_locals(comp: GoAction[]): boolean {
  const tags: string[] = ['var', 'const', 'func']
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
        return comp.body[0]
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
      instrs[wc++] = {
        tag: 'LD',
        sym: comp.sym,
        pos: compile_time_environment_position(ce, comp.sym)
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
  // log: (comp, ce) => {
  //   compile(
  //     comp.sym == '&&'
  //       ? { tag: 'cond_expr', pred: comp.frst, cons: { tag: 'lit', val: true }, alt: comp.scnd }
  //       : { tag: 'cond_expr', pred: cmd.frst, cons: cmd.scnd, alt: { tag: 'lit', val: false } },
  //     ce
  //   )
  // },
  // cond: (comp, ce) => {
  //   compile(comp.pred, ce)
  //   const jump_on_false_instruction = { tag: 'JOF' }
  //   instrs[wc++] = jump_on_false_instruction
  //   compile(comp.cons, ce)
  //   const goto_instruction = { tag: 'GOTO' }
  //   instrs[wc++] = goto_instruction
  //   const alternative_address = wc
  //   jump_on_false_instruction.addr = alternative_address
  //   compile(comp.alt, ce)
  //   goto_instruction.addr = wc
  // },
  // while: (comp, ce) => {
  //   const loop_start = wc
  //   compile(comp.pred, ce)
  //   const jump_on_false_instruction = { tag: 'JOF' }
  //   instrs[wc++] = jump_on_false_instruction
  //   compile(comp.body, ce)
  //   instrs[wc++] = { tag: 'POP' }
  //   instrs[wc++] = { tag: 'GOTO', addr: loop_start }
  //   jump_on_false_instruction.addr = wc
  //   instrs[wc++] = { tag: 'LDC', val: undefined }
  // },
  // app: (comp, ce) => {
  //   compile(comp.fun, ce)
  //   for (let arg of comp.args) {
  //     compile(arg, ce)
  //   }
  //   instrs[wc++] = { tag: 'CALL', arity: comp.args.length }
  // },
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
    instrs[wc++] = { tag: 'ASSIGN', pos: compile_time_environment_position(ce, comp.sym.sym) }
  },
  const: (comp: ConstStatement, ce: string[][]) => {
    compile(comp.expr, ce)
    instrs[wc++] = { tag: 'ASSIGN', pos: compile_time_environment_position(ce, comp.sym.sym) }
  }
  // ret: (comp, ce) => {
  //   compile(comp.expr, ce)
  //   if (comp.expr.tag === 'app') {
  //     // tail call: turn CALL into TAILCALL
  //     instrs[wc - 1].tag = 'TAIL_CALL'
  //   } else {
  //     instrs[wc++] = { tag: 'RESET' }
  //   }
  // },
  // fun: (comp, ce) => {
  //   compile(
  //     { tag: 'const', sym: comp.sym, expr: { tag: 'lam', prms: comp.prms, body: comp.body } },
  //     ce
  //   )
  // }
}

const testcode = `
a := 1+2-4
const b = 3
a = a + b
`

compile_program(parse(testcode))
printInstr()

function printInstr() {
  for (let i = 0; i < instrs.length; i++) {
    console.log(instrs[i])
  }
  console.log(run(1000, instrs))
}
