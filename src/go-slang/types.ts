export type GoAction = GoStatement | GoExpression | Identifier

export type GoStatement =
  | BlockStatement
  | SeqStatement
  | VarStatement
  | ConstStatement
  | CondStatement
  | WhileStatement
  | ContinueStatement
  | BreakStatement
  | ReturnStatement
  | FunctionStatement
  | GoroutineStatement
  | GoExpression
  | BlkSeqStatement

export type GoLiteral = BooleanLiteral | IntLiteral | StringLiteral // | NullLiteral

export type GoExpression =
  | CallExpression
  | AssignmentExpression
  | UnaryExpression
  | BinaryExpression
  | LogicalExpression

export enum Tag {
  Lit = 'lit',
  Nam = 'nam'
}

export enum GoType {
  Integer = 'Integer',
  Null = 'Null',
  String = 'String',
  Boolean = 'Boolean'
}

export enum GoAssignmentOperator {
  Equal = '=',
  Add = '+=',
  Minus = '-=',
  Multiply = '*=',
  Divide = '/=',
  Mod = '%='
}

export enum GoUnaryOperator {
  UnaryMinus = '-',
  Increment = '++',
  Decrement = '--'
}

export enum GoBinaryOperator {
  Add = '+',
  Minus = '-',
  Multiply = '*',
  Divide = '/',
  Mod = '%',
  Equal = '==',
  NotEqual = '!=',
  MoreThan = '>',
  LessThan = '<',
  MoreThanOrEqual = '>=',
  LessThanOrEqual = '<='
}

export enum GoLogicalOperator {
  And = '&&',
  Or = '||'
}

export interface Identifier {
  tag: 'nam'
  sym: string
  type: GoType
}

export interface NullLiteral {
  tag: 'lit'
  type: 'Null'
  val: null
}

export interface BooleanLiteral {
  tag: 'lit'
  type: 'Boolean'
  val: boolean
}

export interface IntLiteral {
  tag: 'lit'
  type: 'Integer'
  val: number
}

export interface StringLiteral {
  tag: 'lit'
  type: 'String'
  val: string
}

export interface CallExpression {
  tag: 'app'
  fun: Identifier
  args: GoExpression[]
}

export interface AssignmentExpression {
  tag: 'assmt'
  op: GoAssignmentOperator
  sym: Identifier
  expr: GoExpression
}

export interface UnaryExpression {
  tag: 'unop'
  sym: GoUnaryOperator
  arg: GoExpression | Identifier
  prefix: boolean
}

export interface BinaryExpression {
  tag: 'binop'
  sym: GoBinaryOperator
  first: GoExpression | Identifier
  second: GoExpression | Identifier
}

export interface LogicalExpression {
  tag: 'log'
  sym: GoLogicalOperator
  first: GoExpression | Identifier
  second: GoExpression | Identifier
}

export interface VarStatement {
  tag: 'var'
  sym: Identifier
  type?: GoType
  expr: GoExpression
}

export interface ConstStatement {
  tag: 'const'
  sym: Identifier
  type: GoType
  expr: GoExpression
}

export interface CondStatement {
  tag: 'cond'
  pred: GoExpression
  cons: BlockStatement
  alt: BlockStatement
}

export interface WhileStatement {
  tag: 'while'
  pred: GoExpression
  body: BlockStatement
}

export interface ContinueStatement {
  tag: 'continue'
  label: Identifier
}

export interface BreakStatement {
  tag: 'break'
  label: Identifier
}

export interface ReturnStatement {
  tag: 'ret'
  expr: GoExpression
}

export interface GoroutineStatement {
  tag: 'goroutine'
  expr: FunctionStatement
}

export interface FunctionStatement {
  tag: 'func'
  sym: Identifier
  prms: Identifier[]
  type: GoType[]
  body: BlockStatement
}

export interface BlkSeqStatement {
  tag: 'blkseq'
  body: GoAction[]
}

export interface BlockStatement {
  tag: 'blk'
  body: GoAction
}

export interface SeqStatement {
  tag: 'seq'
  stmts: GoAction[]
}
