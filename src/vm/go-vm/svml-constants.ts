export type Operand = number | string | boolean | undefined | null

export interface Instruction {
  tag: string

  val?: number | string | boolean // For LDC

  sym?: string // For UNOP or BINOP
  // corresponds to

  addr?: number // For JOF, GOTO, LDF

  arity?: number // For LDF, CALL, TAIL_CALL

  pos?: [number, number] // For
  num?: number
}

export interface ThreadEnv {
  OS: number[]
  PC: number
  RTS: number[]
  E: number
  sleep: number
}

export type ThreadPool = ThreadPoolItem[]

export interface ThreadPoolItem {
  instrs: Instruction[]
  env: ThreadEnv
  microcode: Microcode
}

export interface Microcode {
  [key: string]: (instr: Instruction) => void
}

export interface BuiltinMap {
  [key: string]: BuiltinTag
}

export interface BuiltinTag {
  tag: 'BUILTIN'
  id: number
  arity: number
}

export type BuiltinFn = (env: ThreadEnv) => any
