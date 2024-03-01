export type Operand = number | string | boolean | undefined | null

export interface Instruction {
    tag: string,
    
    val?: number | string   // For LDC 
    
    sym?: string            // For UNOP or BINOP
                            // corresponds to 

    addr?: number           // For JOF, GOTO, LDF

    arity?: number          // For LDF, CALL, TAIL_CALL

    pos?: [number, number]            // For 
    num?: number
}