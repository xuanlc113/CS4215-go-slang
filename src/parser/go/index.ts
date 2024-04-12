import { Program } from 'estree'

import { parsePythonToEstreeAst } from '../../py-slang/src'
import { Chapter, Context } from '../../types'
import { FatalSyntaxError } from '../errors'
import { AcornOptions, Parser } from '../types'
import { positionToSourceLocation } from '../utils'

export class GoParser implements Parser<AcornOptions> {
  private chapter: Chapter
  constructor(chapter: Chapter) {
    this.chapter = chapter
  }
  parse(
    programStr: string,
    context: Context,
    options?: Partial<AcornOptions>,
    throwOnError?: boolean
  ): Program | null {
    try {
      const chapterNum = (() => {
        switch (this.chapter) {
          case Chapter.GO_1:
            return 1
          default:
            throw new Error('Unreachable path')
        }
      })()
      return parsePythonToEstreeAst(programStr, chapterNum, false)
    } catch (error) {
      if (error instanceof SyntaxError) {
        error = new FatalSyntaxError(positionToSourceLocation((error as any).loc), error.toString())
      }

      if (throwOnError) throw error
      context.errors.push(error)
    }
    return null
  }

  validate(_ast: Program, _context: Context, _throwOnError: boolean): boolean {
    return true
  }

  toString(): string {
    return `GoParser{chapter: ${this.chapter}}`
  }
}
