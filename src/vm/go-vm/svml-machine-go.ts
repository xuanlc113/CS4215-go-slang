/**
 * Low level memory model, HEAP
 *
 * Implementation is a translation of model given in
 * homework assignments from JS to TS
 */

import { cloneDeep } from 'lodash'
import {
  Operand,
  Instruction,
  ThreadEnv,
  ThreadPool,
  Microcode,
  ThreadPoolItem,
  BuiltinMap,
  BuiltinTag,
  BuiltinFn
} from './svml-constants'

// Global Variables for HEAP
let HEAP: DataView
let heap_size: number // Number of words on the heap

// DEBUGGING
// @ts-ignore: unused
const heap_display = (s: any) => {
  console.log('', 'heap: ' + s)
  for (let i = 0; i < heap_size; i++) {
    console.log(
      word_to_string(heap_get(i)),
      JSON.stringify(i) + ' ' + JSON.stringify(heap_get(i)) + ' '
    )
  }
}

// for debugging: return a string that shows the bits
// of a given word
function word_to_string(word: number): string {
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  view.setFloat64(0, word)
  let binStr = ''
  for (let i = 0; i < 8; i++) {
    binStr += ('00000000' + view.getUint8(i).toString(2)).slice(-8) + ' '
  }
  return binStr
}

// @ts-ignore: unused
const heap_Environment_display = (env_address: number) => {
  const size = heap_get_number_of_children(env_address)
  console.log('Environment:')
  console.log('environment size:', size)
  for (let i = 0; i < size; i++) {
    console.log('frame index:', i)
    const frame = heap_get_child(env_address, i)
    heap_Frame_display(frame)
  }
}

const heap_Frame_display = (address: number) => {
  console.log('Frame')
  const size = heap_get_number_of_children(address)
  console.log('frame size', size)
  for (let i = 0; i < size; i++) {
    console.log('value address:', i)
    const value = heap_get_child(address, i)
    console.log('value:', value)
    console.log('value word:', word_to_string(value))
  }
}

// DEBUGGING

// next free index in the heap list
let free: number

// 8 bytes together form a word
const word_size: number = 8
const node_size: number = 10

// Allocates ArrayBuffer with word_size * words bytes
function heap_make(words: number): DataView {
  const data = new ArrayBuffer(words * word_size)
  const view = new DataView(data)
  return view
}

// heap_allocate allocates a given number of words
// on the heap and marks the first word with a 1-byte tag.
// the last two bytes of the first word indicate the number
// of children (addresses) that follow the tag word:
// [1 byte tag, 4 bytes payload (depending on node type),
//  2 bytes #children + 1(self), 1 byte unused]
const size_offset: number = 5

function heap_allocate(tag: number, size: number): number {
  if (free + size >= heap_size) {
    throw Error('heap memory exhuasted')
  }
  const address = free

  // Advance pointer in freelist
  free = heap_get(free)

  HEAP.setInt8(address * word_size, tag)
  HEAP.setUint16(address * word_size + size_offset, size)
  return address
}

function heap_get(address: number): number {
  return HEAP.getFloat64(address * word_size)
}

function heap_set(address: number, x: number): void {
  HEAP.setFloat64(address * word_size, x)
}

// Handling children nodes of tag
// + 1 is to skip self
// child_idx starts from 0
function heap_get_child(address: number, child_idx: number): number {
  return heap_get(address + 1 + child_idx)
}

function heap_set_child(address: number, child_idx: number, value: number): void {
  heap_set(address + 1 + child_idx, value)
}

// Get pointer tag
function heap_get_tag(address: number): number {
  return HEAP.getInt8(address * word_size)
}

function heap_get_size(address: number): number {
  return HEAP.getUint16(address * word_size + size_offset)
}

function heap_get_number_of_children(address: number): number {
  if (heap_get_tag(address) === Number_tag) return 0
  return heap_get_size(address) - 1
}

// Byte operations
function heap_set_byte_at_offset(address: number, offset: number, value: number): void {
  HEAP.setUint8(address * word_size + offset, value)
}

function heap_get_byte_at_offset(address: number, offset: number): number {
  return HEAP.getUint8(address * word_size + offset)
}

// 2 Bytes operations
function heap_set_2_bytes_at_offset(address: number, offset: number, value: number): void {
  HEAP.setUint16(address * word_size + offset, value)
}

function heap_get_2_bytes_at_offset(address: number, offset: number): number {
  return HEAP.getUint16(address * word_size + offset)
}

// 4 Bytes operations
function heap_set_4_bytes_at_offset(address: number, offset: number, value: number): void {
  HEAP.setUint32(address * word_size + offset, value)
}

function heap_get_4_bytes_at_offset(address: number, offset: number): number {
  return HEAP.getUint32(address * word_size + offset)
}

// Heap Pointer Tags
const False_tag = 0
const True_tag = 1
const Number_tag = 2
const Null_tag = 3
const Unassigned_tag = 4
// const Undefined_tag      = 5
const Blockframe_tag = 6
const Callframe_tag = 7
const Closure_tag = 8
const Frame_tag = 9 // 0000 1001
const Environment_tag = 10 // 0000 1010
// const Pair_tag           = 11
const Builtin_tag = 12
// const Pointer_tag        = 13
// const Goroutine_tag      = 14
const String_tag = 15
const WaitGroup_tag = 16
const Mutex_tag = 17
const Defer_tag = 18
const Channel_tag = 19

// Manually Allocate Literal Values on the HEAP
let False: number
function is_False(address: number): boolean {
  return heap_get_tag(address) === False_tag
}

let True: number
function is_True(address: number): boolean {
  return heap_get_tag(address) === True_tag
}

function is_Boolean(address: number): boolean {
  return is_True(address) || is_False(address)
}

let Null: number
function is_Null(address: number): boolean {
  return heap_get_tag(address) === Null_tag
}

// let Undefined: number
// function is_Undefined(address: number): boolean {
//     return heap_get_tag(address) === Undefined_tag
// }

let Unassigned: number
function is_Unassigned(address: number): boolean {
  return heap_get_tag(address) === Unassigned_tag
}

function allocate_literal_values(): void {
  False = heap_allocate(False_tag, 1)
  True = heap_allocate(True_tag, 1)
  Null = heap_allocate(Null_tag, 1)
  Unassigned = heap_allocate(Unassigned_tag, 1)
  // Undefined = heap_allocate(Undefined_tag, 1)
}

const builtin_implementation = {
  print: (env: ThreadEnv, arity: number) => {
    const toPrint = []
    for (let i = 0; i < arity; i++) {
      toPrint.push(address_to_TS_value(pop_OS(env.OS))?.toString())
    }
    const output = toPrint.reverse().join(' ')
    console.log(output)
    return output
  },
  sleep: (env: ThreadEnv) => {
    const val = (address_to_TS_value(pop_OS(env.OS)) as number) + Date.now()
    env.sleep = heap_allocate_Number(val)
  },
  Add: (env: ThreadEnv) => {
    const arg = pop_OS(env.OS) // Argument to the method
    const fun = pop_OS(env.OS) // Method to be put back on OS later
    const obj = pop_OS(env.OS) // Obj whose method is invoked
    env.OS.push(fun)
    if (!is_WaitGroup(obj)) {
      // error handling
      return
    }
    const curr_wg_cnt = heap_get_WaitGroup_counter(obj)
    const new_wg_cnt = curr_wg_cnt + (address_to_TS_value(arg) as number)
    if (new_wg_cnt < 0) {
      console.log('Throw Panic')
      // not sure what to do here
    }
    heap_set_WaitGroup_counter(obj, new_wg_cnt)
  },
  Wait: (env: ThreadEnv) => {
    const fun = pop_OS(env.OS) // Method to be put back on OS later
    const obj = pop_OS(env.OS) // Obj whose method is invoked
    env.OS.push(fun)
    if (!is_WaitGroup(obj)) {
      // error handling
      return
    }
    // Block until counter is 0
    const wg_count = heap_get_WaitGroup_counter(obj)
    if (wg_count > 0) {
      env.wg_count = obj
    }
  },
  Done: (env: ThreadEnv) => {
    const fun = pop_OS(env.OS) // Method to be put back on OS later
    const obj = pop_OS(env.OS) // Obj whose method is invoked
    env.OS.push(fun)
    if (!is_WaitGroup(obj)) {
      // error handling
      console.log('obj is not a waitgroup')
      return
    }
    const curr_wg_cnt = heap_get_WaitGroup_counter(obj)
    heap_set_WaitGroup_counter(obj, curr_wg_cnt - 1)
  },
  Lock: (env: ThreadEnv) => {
    const fun = pop_OS(env.OS)
    const obj = pop_OS(env.OS)
    env.OS.push(fun)
    if (!is_Mutex(obj)) {
      // error handling
      console.log('obj is not a mutex')
      return
    }
    const mutex_state = heap_get_Mutex_State(obj)
    if (mutex_state == MUTEX_UNLOCKED_STATE) {
      heap_set_Mutex(obj, MUTEX_LOCKED_STATE)
    } else {
      env.mutex = obj
    }
  },
  Unlock: (env: ThreadEnv) => {
    const fun = pop_OS(env.OS)
    const obj = pop_OS(env.OS)
    env.OS.push(fun)
    if (!is_Mutex(obj)) {
      // error handling
      console.log('obj is not a mutex')
      return
    }
    const mutex_state = heap_get_Mutex_State(obj)
    if (mutex_state == MUTEX_LOCKED_STATE) {
      heap_set_Mutex(obj, MUTEX_UNLOCKED_STATE)
    } else {
      throw Error('Unlock mutex called but mutex was not locked')
    }
  },
  intchannel: (env: ThreadEnv, arity: number) => {
    let size = 0
    if (arity == 1) {
      size = address_to_TS_value(pop_OS(env.OS)) as number
    }
    const address = heap_allocate_Channel(size)

    return address
  },
  stringchannel: (env: ThreadEnv, arity: number) => {
    let size = 0
    if (arity == 1) {
      size = address_to_TS_value(pop_OS(env.OS)) as number
    }
    const address = heap_allocate_Channel(size)

    return address
  }
}

const builtins: BuiltinMap = {}
const builtin_array: BuiltinFn[] = []
{
  let i = 0
  for (const key in builtin_implementation) {
    builtins[key] = { tag: 'BUILTIN', id: i, arity: builtin_implementation[key].length }
    builtin_array[i++] = builtin_implementation[key]
  }
}

function apply_builtin(builtin_id: number, env: ThreadEnv, arity: number) {
  const result = builtin_array[builtin_id](env, arity)
  env.OS.pop() // pop fun
  push(env.OS, result)
}

function allocate_builtin_frame(): number {
  const builtin_values: BuiltinTag[] = Object.values(builtins)
  const frame_address = heap_allocate_Frame(builtin_values.length)
  for (let i = 0; i < builtin_values.length; i++) {
    const builtin: BuiltinTag = builtin_values[i]
    heap_set_child(frame_address, i, heap_allocate_Builtin(builtin.id))
  }
  return frame_address
}

const constants = {}
function allocate_constant_frame(): number {
  const constant_values = Object.values(constants)
  const frame_address = heap_allocate_Frame(constant_values.length)
  for (let i = 0; i < constant_values.length; i++) {
    // const constant_value = constant_values[i];
    // if (typeof constant_value === "undefined") {
    //     heap_set_child(frame_address, i, Undefined)
    // } else {
    //     heap_set_child(
    //         frame_address,
    //         i,
    //         heap_allocate_Number(constant_value))
    // }
  }
  return frame_address
}
// builtins: builtin id is encoded in second byte
// [1 byte tag, 1 byte id, 3 bytes unused,
//  2 bytes #children, 1 byte unused]
// Note: #children is 0
function is_Builtin(address: number): boolean {
  return heap_get_tag(address) === Builtin_tag
}

function heap_allocate_Builtin(id: number): number {
  const address = heap_allocate(Builtin_tag, 1)
  heap_set_byte_at_offset(address, 1, id)
  return address
}

function heap_get_Builtin_id(address: number): number {
  return heap_get_byte_at_offset(address, 1)
}

// closure
// [1 byte tag, 1 byte arity, 2 bytes pc, 1 byte unused,
//  2 bytes #children, 1 byte unused]
// followed by the address of env
// note: currently bytes at offset 4 and 7 are not used;
//   they could be used to increase pc and #children range
function heap_allocate_Closure(arity: number, pc: number, env: number): number {
  const address = heap_allocate(Closure_tag, 2)
  heap_set_byte_at_offset(address, 1, arity)
  heap_set_2_bytes_at_offset(address, 2, pc)
  heap_set(address + 1, env)
  return address
}

// function heap_get_Closure_arity(address: number): number {
//     return heap_get_byte_at_offset(address, 1)
// }

function heap_get_Closure_pc(address: number): number {
  return heap_get_2_bytes_at_offset(address, 2)
}

function heap_get_Closure_environment(address: number): number {
  return heap_get_child(address, 0)
}

function is_Closure(address: number): boolean {
  return heap_get_tag(address) === Closure_tag
}

// block frame
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
function heap_allocate_Blockframe(env: number): number {
  const address = heap_allocate(Blockframe_tag, 2)
  heap_set(address + 1, env)
  return address
}

function heap_get_Blockframe_environment(address: number): number {
  return heap_get_child(address, 0)
}

// function is_Blockframe (address: number): boolean {
//     return heap_get_tag(address) === Blockframe_tag
// }

// call frame
// [1 byte tag, 1 byte unused, 2 bytes pc,
//  1 byte unused, 2 bytes #children, 1 byte unused]
// followed by the address of env
function heap_allocate_Callframe(env: number, pc: number): number {
  const address = heap_allocate(Callframe_tag, 2)
  heap_set_2_bytes_at_offset(address, 2, pc)
  heap_set(address + 1, env)
  return address
}

function heap_get_Callframe_environment(address: number): number {
  return heap_get_child(address, 0)
}

function heap_get_Callframe_pc(address: number): number {
  return heap_get_2_bytes_at_offset(address, 2)
}

function is_Callframe(address: number): boolean {
  return heap_get_tag(address) === Callframe_tag
}

// environment frame
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the addresses of its values
function heap_allocate_Frame(number_of_values: number): number {
  return heap_allocate(Frame_tag, number_of_values + 1)
}

// environment
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the addresses of its frames
function heap_allocate_Environment(number_of_frames: number): number {
  return heap_allocate(Environment_tag, number_of_frames + 1)
}

// access environment given by address
// using a "position", i.e. a pair of
// frame index and value index
function heap_get_Environment_value(env_address: number, position: [number, number]) {
  const [frame_index, value_index] = position
  const frame_address = heap_get_child(env_address, frame_index)
  return heap_get_child(frame_address, value_index)
}

function heap_set_Environment_value(
  env_address: number,
  position: [number, number],
  value: number
): void {
  const [frame_index, value_index] = position
  const frame_address = heap_get_child(env_address, frame_index)
  heap_set_child(frame_address, value_index, value)
}

// extend a given environment by a new frame:
// create a new environment that is bigger by 1
// frame slot than the given environment.
// copy the frame Addresses of the given
// environment to the new environment.
// enter the address of the new frame to end
// of the new environment
function heap_Environment_extend(frame_address: number, env_address: number): number {
  const old_size = heap_get_size(env_address)
  const new_env_address = heap_allocate_Environment(old_size)
  let i
  for (i = 0; i < old_size - 1; i++) {
    heap_set_child(new_env_address, i, heap_get_child(env_address, i))
  }
  heap_set_child(new_env_address, i, frame_address)
  return new_env_address
}

// number
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the number, one word
// note: #children is 0

function heap_allocate_Number(n: number): number {
  const number_address = heap_allocate(Number_tag, 2)
  heap_set(number_address + 1, n)
  return number_address
}

function is_Number(address: number): boolean {
  return heap_get_tag(address) === Number_tag
}

// NO STRING POOLING
// string
// [1 byte tag, 4 bytes len of string,
//  2 bytes #children, 1 byte unused]
// followed by its characters, ceil(string len / 8) words
// note: #children is 0
function heap_allocate_String(s: string): number {
  const num_words = Math.ceil(s.length / 8)
  const str_address = heap_allocate(String_tag, num_words + 1)

  // set strlen
  heap_set_4_bytes_at_offset(str_address, 1, s.length)

  let i
  for (i = 0; i < s.length; i++) {
    heap_set_byte_at_offset(str_address + 1, i, s.charCodeAt(i))
  }

  return str_address
}

function heap_get_String(address: number): string {
  const str_length = heap_get_4_bytes_at_offset(address, 1)

  let res_str = ''
  let i
  for (i = 0; i < str_length; i++) {
    res_str += String.fromCharCode(heap_get_byte_at_offset(address + 1, i))
  }

  return res_str
}

function is_String(address: number): boolean {
  return heap_get_tag(address) === String_tag
}

// WaitGroup
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the number, one word
// note: #children is 1
function heap_allocate_WaitGroup(): number {
  const wg_address = heap_allocate(WaitGroup_tag, 2)
  heap_set(wg_address + 1, 0)
  return wg_address
}

function heap_get_WaitGroup_counter(address: number): number {
  return heap_get(address + 1)
}

function heap_set_WaitGroup_counter(address: number, n: number): void {
  heap_set(address + 1, n)
}

function is_WaitGroup(address: number): boolean {
  return heap_get_tag(address) === WaitGroup_tag
}

// Mutex
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the number, one word
// 0 is unlocked
// 1 is

const MUTEX_UNLOCKED_STATE = 0
const MUTEX_LOCKED_STATE = 1

function heap_allocate_Mutex(): number {
  const mutex_address = heap_allocate(Mutex_tag, 2)
  heap_set(mutex_address + 1, MUTEX_UNLOCKED_STATE)
  return mutex_address
}

function heap_set_Mutex(address: number, state: number): void {
  heap_set(address + 1, state)
}

function heap_get_Mutex_State(address: number): number {
  return heap_get(address + 1)
}

function is_Mutex(address: number): boolean {
  return heap_get_tag(address) === Mutex_tag
}

function heap_allocate_Defer(): number {
  const def_address = heap_allocate(Defer_tag, 1)
  return def_address
}

function is_Defer(address: number): boolean {
  return heap_get_tag(address) === Defer_tag
}

// 2 for recording size and cap, + 1 for array space without buffer
function heap_allocate_Channel(size: number = 0): number {
  const address = heap_allocate(Channel_tag, size + 3)
  heap_set_child(address, 0, heap_allocate_Number(0))
  heap_set_child(address, 1, heap_allocate_Number(size + 1))
  for (let i = 0; i < size + 1; i++) {
    heap_set_child(address, i + 2, heap_allocate(Null_tag, 1))
  }
  return address
}

function can_receieve_from_Channel(address: number): boolean {
  const curSize = address_to_TS_value(heap_get_child(address, 0)) as number
  return curSize > 0
}

function receive_from_Channel(address: number): number {
  const curSizeAddr = heap_get_child(address, 0)
  const curSize = address_to_TS_value(curSizeAddr) as number

  if (curSize == 0) {
    throw Error('Cannot receive from empty channel')
  }

  const rec = heap_get_child(address, 2)
  // iterate up to second last
  for (let i = 2; i < curSize + 1; i++) {
    heap_set_child(address, i, heap_get_child(address, i + 1))
  }
  heap_set_child(address, curSize + 1, heap_allocate(Null_tag, 1))
  heap_set(curSizeAddr + 1, curSize - 1)

  return rec
}

function can_send_to_Channel(address: number, threadpool: ThreadPool): boolean {
  const curSize = address_to_TS_value(heap_get_child(address, 0)) as number
  const cap = address_to_TS_value(heap_get_child(address, 1)) as number
  if (curSize == cap) {
    return false
  } else if (curSize < cap && cap > 1) {
    return true
  } else {
    return threadpool.some(thread => thread.env.waitingToReceive == address)
  }
}

function send_to_Channel(address: number, val: number) {
  const curSizeAddr = heap_get_child(address, 0)
  const curSize = address_to_TS_value(curSizeAddr) as number
  const cap = address_to_TS_value(heap_get_child(address, 1)) as number

  if (curSize == cap) {
    throw Error('cannot send to full channel')
  }

  if (is_Number(val)) {
    const rawVal = address_to_TS_value(val) as number
    heap_set_child(address, curSize + 2, heap_allocate_Number(rawVal))
  } else if (is_String(val)) {
    const rawVal = address_to_TS_value(val) as string
    heap_set_child(address, curSize + 2, heap_allocate_String(rawVal))
  } else {
    throw Error('unsupported channel item type')
  }
  heap_set(curSizeAddr + 1, curSize + 1)
}

// function print_numCh(address: number) {
//   const curSize = address_to_TS_value(heap_get_child(address, 1)) as number
//   const a = []
//   for (let i = 0; i < curSize + 2; i++) {
//     const item = heap_get_child(address, i)
//     a.push(address_to_TS_value(item))
//   }
//   console.log(a)
// }

// conversions between addresses and TS_value
//
function address_to_TS_value(x: number): Operand {
  if (is_Boolean(x)) {
    if (is_True(x)) {
      return true
    }
    return false
  }

  if (is_Number(x)) {
    return heap_get(x + 1)
  }

  if (is_Unassigned(x)) {
    return '<unassigned>'
  }

  if (is_Null(x)) {
    return null
  }

  if (is_Closure(x)) {
    return '<closure>'
  }

  if (is_Builtin(x)) {
    return '<builtin>'
  }

  if (is_String(x)) {
    return heap_get_String(x)
  }

  if (is_WaitGroup(x)) {
    return '<waitgroup>'
  }

  if (is_Mutex(x)) {
    return '<mutex>'
  }

  if (is_Defer(x)) {
    return '<defer>'
  }
  return undefined
}

function is_boolean(x: any): boolean {
  return typeof x === 'boolean'
}

function is_number(x: any): boolean {
  return typeof x === 'number'
}

function is_string(x: any): boolean {
  return typeof x === 'string'
}

function is_undefined(x: any): boolean {
  return x === undefined
}

function is_null(x: any): boolean {
  return x === null
}

function TS_value_to_address(x: any): number {
  let res = is_boolean(x)
    ? x
      ? True
      : False
    : is_number(x)
    ? heap_allocate_Number(x)
    : is_null(x)
    ? Null
    : is_string(x)
    ? heap_allocate_String(x)
    : undefined

  if (is_undefined(res)) {
    // error handling
  }
  return res as number
}

// VM
// let OS: number[] // JS array of words
// let PC: number // JS number
// let E: number // heap addresses
// let RTS: number[] // JS array of addresses
// HEAP declared above

const push = (array: any[], ...items: any[]) => {
  // fixed by Liew Zhao Wei, see Discussion 5
  for (let item of items) {
    array.push(item)
  }
  return array
}

// return the last element of given array
// without changing the array
const peek = (array: any[], address: number) => array.slice(-1 - address)[0]

function pop_OS(OS: number[]): number {
  const res = OS.pop()
  if (is_undefined(res)) {
    throw Error('Popped OS and got undefined')
  }
  return res as number
}

function force_pop_OS(OS: number[]) {
  OS.pop()
}

function pop_RTS(RTS: number[]): number {
  const res = RTS.pop()
  if (is_undefined(res)) {
    throw Error('Popped RTS and got undefined')
  }
  return res as number
}

function get_orig_return(OS: number[]): number {
  if (OS.length == 0) {
    throw Error('No return value in OS')
  }

  let pt = 0

  let orig = peek(OS, pt) as number

  while (pt < OS.length) {
    while (!is_Defer(peek(OS, pt))) {
      orig = peek(OS, pt) as number
      pt++
      if (pt >= OS.length) break
    }
    while (is_Defer(peek(OS, pt))) {
      pt++
    }

    const arity = address_to_TS_value(peek(OS, pt)) as number
    pt += arity + 2
    if (pt < OS.length && !is_Defer(peek(OS, pt))) {
      orig = peek(OS, pt)
    }
  }

  return orig as number
}

function pop_to_defer(OS: number[]) {
  for (let pt = 0; pt < OS.length; pt++) {
    if (is_Defer(peek(OS, pt))) {
      OS.splice(-pt)
      return
    }
  }
}

function apply_binop(op: string, v2: number, v1: number): Operand {
  const op1 = address_to_TS_value(v1)
  const op2 = address_to_TS_value(v2)

  const res = binop_microcode[op](op1, op2)
  const addr = TS_value_to_address(res)
  if (is_undefined(addr)) {
    // error handling
  }
  return addr
}

function apply_logop(op: string, v2: number, v1: number): Operand {
  const op1 = address_to_TS_value(v1)
  const op2 = address_to_TS_value(v2)
  const res = TS_value_to_address(logop_microcode[op](op1, op2))
  if (is_undefined(res)) {
    // error handling
  }
  return res
}

function apply_unop(op: string, v: number): Operand {
  const op1 = address_to_TS_value(v)
  const res = TS_value_to_address(unop_microcode[op](op1))
  if (is_undefined(res)) {
    // error handling
  }
  return res
}

const unop_microcode: { [key: string]: (x: Operand) => Operand } = {
  '-unary': x => {
    if (is_number(x)) {
      return -(x as number)
    }
    return undefined
  },
  '!': x => {
    if (is_boolean(x)) {
      return !(x as boolean)
    }
    return undefined
  }
}

const logop_microcode: { [key: string]: (x: Operand, y: Operand) => Operand } = {
  '&&': (x, y) => {
    if (is_string(x) && is_string(y)) {
      return true
    }
    if (is_number(x) && is_number(y)) {
      return true
    }
    if (is_boolean(x) && is_boolean(y)) {
      if (x && y) {
        return true
      }
      return false
    }
    return undefined
  },
  '||': (x, y) => {
    if (is_string(x) && is_string(y)) {
      return true
    }
    if (is_number(x) && is_number(y)) {
      return true
    }
    if (is_boolean(x) || is_boolean(y)) {
      if (x || y) {
        return true
      }
      return false
    }
    return undefined
  }
}

const binop_microcode: { [key: string]: (x: Operand, y: Operand) => Operand } = {
  '+': (x, y) => {
    if (is_string(x) && is_string(y)) {
      return (x as string) + (y as string)
    }
    if (is_number(x) && is_number(y)) {
      return (x as number) + (y as number)
    }
    return undefined
  },
  '-': (x, y) => {
    if (is_number(x) && is_number(y)) {
      return (x as number) - (y as number)
    }
    return undefined
  },
  '*': (x, y) => {
    if (is_number(x) && is_number(y)) {
      return (x as number) * (y as number)
    }
    return undefined
  },
  '/': (x, y) => {
    if (is_number(x) && is_number(y) && y !== 0) {
      return (x as number) / (y as number)
    }
    return undefined
  },
  '%': (x, y) => {
    if (is_number(x) && is_number(y) && y !== 0) {
      return (x as number) % (y as number)
    }
    return undefined
  },
  '<': (x, y) => {
    if (is_string(x) && is_string(y)) {
      return (x as string) < (y as string)
    }
    if (is_number(x) && is_number(y)) {
      return (x as number) < (y as number)
    }
    return undefined
  },
  '<=': (x, y) => {
    if (is_string(x) && is_string(y)) {
      return (x as string) <= (y as string)
    }
    if (is_number(x) && is_number(y)) {
      return (x as number) <= (y as number)
    }
    return undefined
  },
  '>=': (x, y) => {
    if (is_string(x) && is_string(y)) {
      return (x as string) >= (y as string)
    }
    if (is_number(x) && is_number(y)) {
      return (x as number) >= (y as number)
    }
    return undefined
  },
  '>': (x, y) => {
    if (is_string(x) && is_string(y)) {
      return (x as string) > (y as string)
    }
    if (is_number(x) && is_number(y)) {
      return (x as number) > (y as number)
    }
    return undefined
  },
  '==': (x, y) => {
    if (is_string(x) && is_string(y)) {
      return (x as string) === (y as string)
    }
    if (is_number(x) && is_number(y)) {
      return (x as number) === (y as number)
    }
    if (is_boolean(x) && is_boolean(y)) {
      return (x as boolean) === (y as boolean)
    }
    return undefined
  },
  '!==': (x, y) => {
    if (is_string(x) && is_string(y)) {
      return (x as string) !== (y as string)
    }
    if (is_number(x) && is_number(y)) {
      return (x as number) !== (y as number)
    }
    if (is_boolean(x) && is_boolean(y)) {
      return (x as boolean) !== (y as boolean)
    }
    return undefined
  }
}

function get_instr_sym(instr: Instruction): string {
  if (is_undefined(instr.sym)) {
    throw Error('Missing sym in instruction: ' + instr.tag)
  }
  return instr.sym as string
}

function get_instr_addr(instr: Instruction): number {
  if (is_undefined(instr.addr)) {
    throw Error('Missing addr in instruction: ' + instr.tag)
  }
  return instr.addr as number
}

function get_instr_pos(instr: Instruction): [number, number] {
  if (is_undefined(instr.pos)) {
    throw Error('Missing pos in instruction: ' + instr.tag)
  }
  return instr.pos as [number, number]
}

function get_instr_method_pos(instr: Instruction): [number, number] {
  if (is_undefined(instr.method_pos)) {
    throw Error('Missing method pos in instruction: ' + instr.tag)
  }
  return instr.method_pos as [number, number]
}

function get_instr_num(instr: Instruction): number {
  if (is_undefined(instr.num)) {
    throw Error('Missing num in instruction: ' + instr.tag)
  }
  return instr.num as number
}

function get_instr_arity(instr: Instruction): number {
  if (is_undefined(instr.arity)) {
    throw Error('Missing arity in instruction: ' + instr.tag)
  }
  return instr.arity as number
}

function create_microcode(env: ThreadEnv) {
  const microcode: Microcode = {
    LDC: instr => push(env.OS, TS_value_to_address(instr.val)),
    UNOP: instr => {
      push(env.OS, apply_unop(get_instr_sym(instr), pop_OS(env.OS)))
    },
    BINOP: instr => push(env.OS, apply_binop(get_instr_sym(instr), pop_OS(env.OS), pop_OS(env.OS))),
    LOGOP: instr => push(env.OS, apply_logop(get_instr_sym(instr), pop_OS(env.OS), pop_OS(env.OS))),
    POP: instr => env.OS.pop(),
    JOF: instr => (env.PC = is_True(pop_OS(env.OS)) ? env.PC : get_instr_addr(instr)),
    GOTO: instr => (env.PC = get_instr_addr(instr)),
    ENTER_SCOPE: instr => {
      push(env.RTS, heap_allocate_Blockframe(env.E))
      const num = get_instr_num(instr)
      const frame_address = heap_allocate_Frame(num)
      env.E = heap_Environment_extend(frame_address, env.E)
      for (let i = 0; i < num; i++) {
        heap_set_child(frame_address, i, Unassigned)
      }
    },
    EXIT_SCOPE: instr => (env.E = heap_get_Blockframe_environment(pop_RTS(env.RTS))),
    LD: instr => {
      const val = heap_get_Environment_value(env.E, get_instr_pos(instr))
      if (is_Unassigned(val)) throw Error('Access of unassigned variable')
      // error("access of unassigned variable")
      push(env.OS, val)
    },
    LDM: instr => {
      // This is the address to the object
      const val = heap_get_Environment_value(env.E, get_instr_pos(instr))
      if (is_Unassigned(val)) throw Error('Access of unassigned variable')
      // error("access of unassigned variable")
      push(env.OS, val)

      // Next one is address to the function
      const method_val = heap_get_Environment_value(env.E, get_instr_method_pos(instr))
      if (is_Unassigned(method_val)) throw Error('Access of unassigned variable')
      // error("access of unassigned variable")
      push(env.OS, method_val)
    },
    ALLOCATE: instr => {
      if (instr.type == 'WaitGroup') {
        push(env.OS, heap_allocate_WaitGroup())
      } else if (instr.type == 'Mutex') {
        push(env.OS, heap_allocate_Mutex())
      }
    },
    ASSIGN: instr => {
      heap_set_Environment_value(env.E, get_instr_pos(instr), peek(env.OS, 0))
    },
    LDF: instr => {
      const arity = get_instr_arity(instr)

      const addr = get_instr_addr(instr)
      const closure_address = heap_allocate_Closure(arity, addr, env.E)
      push(env.OS, closure_address)
    },
    CALL: instr => {
      const arity = get_instr_arity(instr)
      const fun = peek(env.OS, arity)
      if (is_Builtin(fun)) {
        return apply_builtin(heap_get_Builtin_id(fun), env, arity)
      }
      const new_PC = heap_get_Closure_pc(fun)
      const new_frame = heap_allocate_Frame(arity)

      for (let i = arity - 1; i >= 0; i--) {
        heap_set_child(new_frame, i, pop_OS(env.OS))
      }
      pop_OS(env.OS) // pop fun
      push(env.RTS, heap_allocate_Callframe(env.E, env.PC))
      env.E = heap_Environment_extend(new_frame, heap_get_Closure_environment(fun))
      env.PC = new_PC
    },
    TAIL_CALL: instr => {
      const arity = get_instr_arity(instr)
      const fun = peek(env.OS, arity)
      if (is_Builtin(fun)) {
        return apply_builtin(heap_get_Builtin_id(fun), env, arity)
      }
      const new_PC = heap_get_Closure_pc(fun)
      const new_frame = heap_allocate_Frame(arity)
      for (let i = arity - 1; i >= 0; i--) {
        heap_set_child(new_frame, i, pop_OS(env.OS))
      }
      pop_OS(env.OS) // pop fun
      // don't push on RTS here
      env.E = heap_Environment_extend(new_frame, heap_get_Closure_environment(fun))
      env.PC = new_PC
    },
    RESET: instr => {
      // keep popping...
      const top_frame = pop_RTS(env.RTS)
      if (is_Callframe(top_frame)) {
        // ...until top frame is a call frame
        env.PC = heap_get_Callframe_pc(top_frame)
        env.E = heap_get_Callframe_environment(top_frame)
      } else {
        env.PC--
      }

      microcode['RUNDEFER']({ tag: 'RUNDEFER' })
    },
    DEFER: instr => {
      const arity = get_instr_arity(instr)
      push(env.OS, TS_value_to_address(arity))
      push(env.OS, heap_allocate_Defer())
      push(env.OS, heap_allocate_Defer()) // added twice to prevent removal by POP
    },
    RUNDEFER: instr => {
      const orig = get_orig_return(env.OS)
      pop_to_defer(env.OS)
      while (is_Defer(peek(env.OS, 0))) {
        while (is_Defer(peek(env.OS, 0))) {
          pop_OS(env.OS)
        }
        const arity = address_to_TS_value(pop_OS(env.OS)) as number
        const fun = peek(env.OS, arity)
        if (is_Builtin(fun)) {
          apply_builtin(heap_get_Builtin_id(fun), env, arity)
          force_pop_OS(env.OS) // ignore result
          continue
        }
        const new_PC = heap_get_Closure_pc(fun)
        const new_frame = heap_allocate_Frame(arity)
        for (let i = arity - 1; i >= 0; i--) {
          heap_set_child(new_frame, i, pop_OS(env.OS))
        }
        pop_OS(env.OS) // pop fun
        push(env.RTS, heap_allocate_Callframe(env.E, env.PC))
        env.E = heap_Environment_extend(new_frame, heap_get_Closure_environment(fun))
        env.PC = new_PC
      }

      // remove previous defer origs
      while (env.OS.length > 0) {
        force_pop_OS(env.OS)
      }
      push(env.OS, orig)
    },
    SEND: (instr, threadpool) => {
      const chAddr = heap_get_Environment_value(env.E, get_instr_pos(instr))
      if (can_send_to_Channel(chAddr, threadpool as ThreadPool)) {
        const val = pop_OS(env.OS)
        send_to_Channel(chAddr, val)
        env.channelBlocked = false
      } else {
        env.PC = get_instr_addr(instr) // revert back to receive command for retry
        env.channelBlocked = true
      }
    },
    RECEIVE: instr => {
      const chAddr = heap_get_Environment_value(env.E, get_instr_pos(instr))
      if (can_receieve_from_Channel(chAddr)) {
        const val = receive_from_Channel(chAddr)
        push(env.OS, val)
        env.channelBlocked = false
        env.waitingToReceive = Null
      } else {
        env.PC = get_instr_addr(instr) // revert back to receive command for retry
        env.channelBlocked = true
        env.waitingToReceive = chAddr
      }
    }
  }

  return microcode
}

export function initialize_heap(heapsize_words: number): void {
  HEAP = heap_make(heapsize_words)
  heap_size = heapsize_words
  // initialize free list:
  // every free node carries the address
  // of the next free node as its first word
  let i = 0
  for (i = 0; i <= heapsize_words - node_size; i = i + node_size) {
    heap_set(i, i + node_size)
  }
  // the empty free list is represented by -1
  heap_set(i - node_size, -1)
  free = 0
  allocate_literal_values()
}

export function initialize_env(root?: ThreadEnv): ThreadEnv {
  if (root == null) {
    const builtins_frame = allocate_builtin_frame()
    const constants_frame = allocate_constant_frame()
    let E = heap_allocate_Environment(0)
    E = heap_Environment_extend(builtins_frame, E)
    E = heap_Environment_extend(constants_frame, E)
    return {
      OS: [],
      PC: 0,
      RTS: [],
      E: E,
      sleep: Null,
      wg_count: Null,
      mutex: Null,
      channelBlocked: false,
      waitingToReceive: Null
    }
  }

  const env = cloneDeep(root)
  //   env.OS.splice(1, env.OS.length - 2) // This has to be related to arity of thread
  //   env.RTS.splice(1, env.RTS.length - 2)
  env.sleep = Null
  env.wg_count = Null
  env.mutex = Null
  env.channelBlocked = false
  env.waitingToReceive = Null

  return env
}

export function run(heapsize_words: number, instrs: Instruction[]) {
  print_code(instrs)
  initialize_heap(heapsize_words)

  const mainEnv: ThreadEnv = initialize_env()
  const threadPool: ThreadPool = [
    {
      instrs: instrs,
      env: mainEnv,
      microcode: create_microcode(mainEnv)
    }
  ]

  let cur = 0
  while (threadPool.length > 0) {
    const thread = threadPool[cur]
    for (let i = 0; i < 3; i++) {
      if (!run_next_instr(thread.instrs, thread.env, thread.microcode, threadPool, cur)) {
        if (cur == 0) {
          return address_to_TS_value(peek(thread.env.OS, 0))
        }
        threadPool.splice(cur, 1)
        break
      }
    }

    cur++
    if (cur >= threadPool.length) {
      cur = 0
    }
  }
  return false
}

function run_next_instr(
  instrs: Instruction[],
  env: ThreadEnv,
  microcode: Microcode,
  threadPool: ThreadPool,
  threadId: number
) {
  if (!is_Null(env.sleep) && Date.now() < (address_to_TS_value(env.sleep) as number)) {
    return true
  } else {
    env.sleep = Null
  }

  if (!is_Null(env.wg_count) && heap_get_WaitGroup_counter(env.wg_count) > 0) {
    return true
  } else {
    env.wg_count = Null
  }

  if (!is_Null(env.mutex) && heap_get_Mutex_State(env.mutex) != MUTEX_UNLOCKED_STATE) {
    return true
  } else {
    heap_set_Mutex(env.mutex, MUTEX_LOCKED_STATE)
    env.mutex = Null
  }

  if (env.channelBlocked) {
    const instr = instrs[env.PC]
    microcode[instr.tag](instr, threadPool)
    if (!env.channelBlocked) {
      env.PC++
    }
    return true
  } else {
    env.channelBlocked = false
  }

  if (instrs[env.PC].tag === 'DONE') {
    return false
  }

  if (instrs[env.PC].tag === 'START_THREAD') {
    const thread_instrs = instrs.slice(0, env.PC + 1)
    thread_instrs[env.PC].tag = 'CALL'
    thread_instrs.push({ tag: 'EXIT_SCOPE' }, { tag: 'DONE' })
    const newEnv = initialize_env(env)
    const threadItem: ThreadPoolItem = {
      instrs: thread_instrs,
      env: newEnv,
      microcode: create_microcode(newEnv)
    }
    threadPool.push(threadItem)

    env.PC++

    return true
  }

  const instr = instrs[env.PC++]
  console.log(threadId, ':', instr, print_OS(env))
  microcode[instr.tag](instr, threadPool)

  return true
}

const print_code = (instrs: Instruction[]) => {
  for (let i = 0; i < instrs.length; i = i + 1) {
    const instr = instrs[i]
    console.log(
      '',
      String(i) +
        ': ' +
        instr.tag +
        ' ' +
        (instr.tag === 'GOTO' ? String(instr.addr) : '') +
        (instr.tag === 'LDC' ? String(instr.val) : '') +
        (instr.tag === 'ASSIGN' ? String(instr.sym) : '') +
        (instr.tag === 'LD' ? String(instr.sym) : '')
    )
  }
}

const print_OS = (env: ThreadEnv) => {
  let s = ''
  for (let i = 0; i < env.OS.length; i++) {
    const v = peek(env.OS, i)
    s += address_to_TS_value(v) + ' '
  }
  return s
}
