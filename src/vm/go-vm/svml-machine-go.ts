/**
 * Low level memory model, HEAP
 * 
 * Implementation is a translation of model given in
 * homework assignments from JS to TS
 */

import { Operand, Instruction } from "./svml-constants"

// Global Variables for HEAP
let HEAP: DataView 
let heap_size: number // Number of words on the heap

// DEBUGGING
// @ts-ignore: unused
const heap_display = (s: any) => {
    console.log("", "heap: " + s)
    for (let i = 0; i < heap_size; i++) {
        console.log(word_to_string(heap_get(i)), 
                JSON.stringify(i) + " " +
                JSON.stringify(heap_get(i)) +
                " ")
    }
}

// for debugging: return a string that shows the bits
// of a given word
function word_to_string(word: number): string {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setFloat64(0, word);
    let binStr = '';
    for (let i = 0; i < 8; i++) {
        binStr += ('00000000' + 
                   view.getUint8(i).toString(2)).slice(-8) + 
                   ' ';
    }
    return binStr
}

// @ts-ignore: unused
const heap_Environment_display = (env_address: number) => {
    const size = heap_get_number_of_children(
                     env_address)
    console.log("Environment:")
    console.log("environment size:", size)
    for (let i = 0; i < size; i++) {
        console.log("frame index:", i)
        const frame = heap_get_child(env_address, i)
        heap_Frame_display(frame)
    }
}

const heap_Frame_display = (address: number) => {
    console.log("Frame")
    const size = heap_get_number_of_children(address)
    console.log("frame size", size)
    for (let i = 0; i < size; i++) {
        console.log("value address:", i)
        const value = 
              heap_get_child(address, i)
        console.log("value:", value)
        console.log("value word:", word_to_string(value))
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
    if (heap_get_tag(address) === Number_tag)
        return 0
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
const False_tag          = 0
const True_tag           = 1
const Number_tag         = 2
const Null_tag           = 3
const Unassigned_tag     = 4
// const Undefined_tag      = 5
const Blockframe_tag     = 6
const Callframe_tag      = 7
const Closure_tag        = 8
const Frame_tag          = 9  // 0000 1001
const Environment_tag    = 10 // 0000 1010
// const Pair_tag           = 11
const Builtin_tag        = 12
// const Pointer_tag        = 13
// const Goroutine_tag      = 14
const String_tag         = 15

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

// builtins: builtin id is encoded in second byte
// [1 byte tag, 1 byte id, 3 bytes unused, 
//  2 bytes #children, 1 byte unused]
// Note: #children is 0
function is_Builtin(address: number): boolean {
    return heap_get_tag(address) === Builtin_tag
}

// function heap_allocate_Builtin(id: number): number {
//     const address = heap_allocate(Builtin_tag, 1)
//     heap_set_byte_at_offset(address, 1, id)
//     return address
// }

// function heap_get_Builtin_id(address: number): number {
//     return heap_get_byte_at_offset(address, 1)
// }

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

function heap_set_Environment_value(env_address: number, position: [number, number], value: number): void {
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

function is_Number (address: number): boolean {
    return heap_get_tag(address) === Number_tag
}

// NO STRING POOLING
// string
// [1 byte tag, 4 bytes len of string,
//  2 bytes #children, 1 byte unused]
// followed by its characters, ceil(string len / 8) words
// note: #children is 0
function heap_allocate_String(s: string): number {
    const num_words = Math.ceil(s.length/8)
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

    let res_str = ""
    let i
    for (i = 0; i < str_length; i++) {
        res_str += String.fromCharCode(heap_get_byte_at_offset(address+1, i))
    }

    return res_str
}

function is_String(address: number): boolean {
    return heap_get_tag(address) === String_tag
}

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
        return heap_get(x+1)
    }

    if (is_Unassigned(x)) {
        return "<unassigned>"
    }

    if (is_Null(x)) {
        return null
    }

    if (is_Closure(x)) {
        return "<closure>"
    }

    if (is_Builtin(x)) {
        return "<builtin>"
    }

    if (is_String(x)) {
        return heap_get_String(x)
    }
    return undefined
}

function is_boolean(x: any): boolean {
    return typeof(x) === 'boolean'
}

function is_number(x: any): boolean {
    return typeof(x) === 'number'
}

function is_string(x: any): boolean {
    return typeof(x) === 'string'
}

function is_undefined(x: any): boolean {
    return x === undefined
}

function is_null(x: any): boolean {
    return x === null
}

function TS_value_to_address(x: any): number { 
    let res =  is_boolean(x)
            ? (x ? True : False)
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
let OS: number[]    // JS array of words
let PC: number      // JS number
let E : number      // heap addresses
let RTS: number[]   // JS array of addresses
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
const peek = (array: any[], address: number) =>
    array.slice(-1 - address)[0]

function pop_OS(): number {
    const res = OS.pop()
    if (is_undefined(res)) {
        throw Error("Popped OS and got undefined")
    }
    return res as number
}

function pop_RTS(): number {
    const res = RTS.pop()
    if (is_undefined(res)) {
        throw Error("Popped RTS and got undefined")
    }
    return res as number
}

function apply_binop(op: string, v2: number, v1: number): Operand { 
    const op1 = address_to_TS_value(v1)
    const op2 = address_to_TS_value(v2)
    const res = TS_value_to_address(binop_microcode[op](op1,op2))
    if (is_undefined(res)) {
        // error handling
    }
    return res
}

function apply_unop (op: string, v: number): Operand { 
    const op1 = address_to_TS_value(v)
    const res = TS_value_to_address(unop_microcode[op](op1))
    if (is_undefined(res)) {
        // error handling
    }
    return res
}

const unop_microcode: { [key: string]: (x: Operand) => Operand } = {
    '-unary': (x) => {
        if (is_number(x)) {
            return - (x as number)
        }
        return undefined
    },
    '!': (x) => {
        if (is_boolean(x)) {
            return ! (x as boolean)
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
    '/': (x,y) => {
        if (is_number(x) && is_number(y) && y !== 0) {
            return (x as number) / (y as number);
        }
        return undefined
    },
    '%': (x,y) => {
        if (is_number(x) && is_number(y) && y !== 0) {
            return (x as number) % (y as number);
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
    '===': (x, y) => {
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
        throw Error("Missing sym in instruction: " + instr.tag)
    }
    return instr.sym as string
}

function get_instr_addr(instr: Instruction): number {
    if (is_undefined(instr.addr)) {
        throw Error("Missing addr in instruction: " + instr.tag)
    }
    return instr.addr as number
}

function get_instr_pos(instr: Instruction): [number, number] {
    if (is_undefined(instr.pos)) {
        throw Error("Missing pos in instruction: " + instr.tag)
    }
    return instr.pos as [number, number]
}

function get_instr_num(instr: Instruction): number {
    if (is_undefined(instr.num)) {
        throw Error("Missing num in instruction: " + instr.tag)
    }
    return instr.num as number
}

function get_instr_arity(instr: Instruction): number {
    if (is_undefined(instr.arity)) {
        throw Error("Missing arity in instruction: " + instr.tag)
    }
    return instr.arity as number
}

const microcode: { [key: string]: (instr: Instruction) => void } = { 
LDC:
    (instr) => 
    push(OS, TS_value_to_address(instr.val)),
UNOP:
    (instr) => {
        push(OS, apply_unop(get_instr_sym(instr), pop_OS()))
    },
BINOP:
    (instr) =>
    push(OS, 
         apply_binop(get_instr_sym(instr), pop_OS(), pop_OS())),
POP: 
    (instr) =>
    OS.pop(),
JOF: 
    (instr) => 
    PC = is_True(pop_OS()) ? PC : get_instr_addr(instr),
GOTO:
    (instr) => 
    PC = get_instr_addr(instr),
ENTER_SCOPE: 
    (instr) => {
        push(RTS, heap_allocate_Blockframe(E))
        const num = get_instr_num(instr)
        const frame_address = heap_allocate_Frame(num)
        E = heap_Environment_extend(frame_address, E)
        for (let i = 0; i < num; i++) {
            heap_set_child(frame_address, i, Unassigned)
        }
    },
EXIT_SCOPE:
    (instr) => 
    E = heap_get_Blockframe_environment(pop_RTS()),
LD: 
    (instr) => {
        const val = heap_get_Environment_value(E, get_instr_pos(instr))
        if (is_Unassigned(val)) 
            throw Error("Access of unassigned variable")
            // error("access of unassigned variable")
        push(OS, val)
    },
ASSIGN: 
    (instr) =>
    heap_set_Environment_value(E, get_instr_pos(instr), peek(OS,0)),
LDF: 
    (instr) => {
        const arity = get_instr_arity(instr)
        
        const addr = get_instr_addr(instr)
        const closure_address = 
                  heap_allocate_Closure(
                      arity, addr, E)
        push(OS, closure_address)
    },
CALL: 
    (instr) => {
        const arity = get_instr_arity(instr)
        const fun = peek(OS, arity)
        // if (is_Builtin(fun)) {
        //     return apply_builtin(heap_get_Builtin_id(fun))
        // }
        const new_PC = heap_get_Closure_pc(fun)
        const new_frame = heap_allocate_Frame(arity)
        
        for (let i = arity - 1; i >= 0; i--) {
            heap_set_child(new_frame, i, pop_OS())
        }
        pop_OS()
        OS.pop() // pop fun
        push(RTS, heap_allocate_Callframe(E, PC))
        E = heap_Environment_extend(
                new_frame, 
                heap_get_Closure_environment(fun))
        PC = new_PC
    },
TAIL_CALL: 
    (instr) => {
        const arity = get_instr_arity(instr)
        const fun = peek(OS, arity)
        // if (is_Builtin(fun)) {
        //     return apply_builtin(heap_get_Builtin_id(fun))
        // }
        const new_PC = heap_get_Closure_pc(fun)
        const new_frame = heap_allocate_Frame(arity)
        for (let i = arity - 1; i >= 0; i--) {
            heap_set_child(new_frame, i, pop_OS())
        }
        OS.pop() // pop fun
        // don't push on RTS here
        E = heap_Environment_extend(
                new_frame,
                heap_get_Closure_environment(fun))
        PC = new_PC
    },
RESET: 
    (instr) => {
        // keep popping...
        const top_frame = pop_RTS()
        if (is_Callframe(top_frame)) {
            // ...until top frame is a call frame
            PC = heap_get_Callframe_pc(top_frame)
            E = heap_get_Callframe_environment(top_frame)
        } else {
	        PC--
        }    
    }
}

function initialize_machine(heapsize_words: number): void {
    OS = []
    PC = 0
    RTS = []
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
    PC = 0
    allocate_literal_values()
    // const builtins_frame = allocate_builtin_frame()
    // const constants_frame = allocate_constant_frame()
    E = heap_allocate_Environment(0)
    // E = heap_Environment_extend(builtins_frame, E)
    // E = heap_Environment_extend(constants_frame, E)
}

export function run(heapsize_words: number, instrs: Instruction[]) {
    initialize_machine(heapsize_words)
    // print_code()
    while (! (instrs[PC].tag === 'DONE')) {
        // heap_display()
        // display(PC, "PC: ")
        // display(instrs[PC].tag, "instr: ")
        // print_OS("\noperands:            ");
        // print_RTS("\nRTS:            ");
        const instr = instrs[PC++]
        //display(instrs[PC].tag, "next instruction: ")
        microcode[instr.tag](instr)
        //display(free)
        // mark_sweep()
        // heap_Environment_display(E)
        // console.log(instr)
        // console.log(OS)
    }
    //display(OS, "\nfinal operands:           ")
    //print_OS()
    // console.log(JSON.stringify(OS))
    // console.log(address_to_TS_value(90))
    // heap_display("S")
    // console.log(OS)
    return address_to_TS_value(peek(OS, 0))
} 

// Generate instructions fron the HW compiler
// Remove bulitin environments and constant environments
// That is under TODO
let instrs: Instruction[] = [
    {"tag": "ENTER_SCOPE", "num": 3},
    {"tag": "LDF", "arity": 1, "addr": 3},
    {"tag": "GOTO", "addr": 10},
    {"tag": "LD", "sym": "fact_iter", "pos": [0, 1]},
    {"tag": "LD", "sym": "n", "pos": [1, 0]},
    {"tag": "LDC", "val": 1},
    {"tag": "LDC", "val": 1},
    {"tag": "TAIL_CALL", "arity": 3},
    {"tag": "LDC", "val": undefined},
    {"tag": "RESET"},
    {"tag": "ASSIGN", "pos": [0, 0]},
    {"tag": "POP"},
    {"tag": "LDF", "arity": 3, "addr": 14},
    {"tag": "GOTO", "addr": 32},
    {"tag": "LD", "sym": "i", "pos": [1, 1]},
    {"tag": "LD", "sym": "n", "pos": [1, 0]},
    {"tag": "BINOP", "sym": ">"},
    {"tag": "JOF", "addr": 21},
    {"tag": "LD", "sym": "acc", "pos": [1, 2]},
    {"tag": "RESET"},
    {"tag": "GOTO", "addr": 30},
    {"tag": "LD", "sym": "fact_iter", "pos": [0, 1]},
    {"tag": "LD", "sym": "n", "pos": [1, 0]},
    {"tag": "LD", "sym": "i", "pos": [1, 1]},
    {"tag": "LDC", "val": 1},
    {"tag": "BINOP", "sym": "+"},
    {"tag": "LD", "sym": "acc", "pos": [1, 2]},
    {"tag": "LD", "sym": "i", "pos": [1, 1]},
    {"tag": "BINOP", "sym": "*"},
    {"tag": "TAIL_CALL", "arity": 3},
    {"tag": "LDC", "val": undefined},
    {"tag": "RESET"},
    {"tag": "ASSIGN", "pos": [0, 1]},
    {"tag": "POP"},
    {"tag": "LD", "sym": "fact", "pos": [0, 0]},
    {"tag": "LDC", "val": 5},
    {"tag": "CALL", "arity": 1},
    {"tag": "POP"},
    {"tag": "LDC", "val": "string"},
    {"tag": "ASSIGN", "pos": [0, 2]},
    {"tag": "POP"},
    {"tag": "LD", "sym": "a", "pos": [0, 2]},
    {"tag": "EXIT_SCOPE"},
    {"tag": "DONE"}
    ]

console.log(run(1000, instrs))