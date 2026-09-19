import Papa from 'papaparse'
import type { ExamQuestion } from '../../core/types'

export const REQUIRED_COLUMNS = [
  'question',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer',
] as const
const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D'])
const MAX_ROW_ERRORS_SHOWN = 5

export type ParseResult = { ok: true; questions: ExamQuestion[] } | { ok: false; error: string }

export function parseExamQuestionsCsv(text: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
  if (result.errors.length > 0) {
    const first = result.errors[0]
    return {
      ok: false,
      error: `CSV parse error: ${first.message}${first.row !== undefined ? ` (row ${first.row + 2})` : ''}.`,
    }
  }
  const headers = result.meta.fields || []
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column))
  if (missingColumns.length > 0) {
    return {
      ok: false,
      error: `Missing required column(s): ${missingColumns.join(', ')}. Expected columns: ${REQUIRED_COLUMNS.join(', ')}, explanation (optional).`,
    }
  }
  if (result.data.length === 0) {
    return { ok: false, error: 'CSV has no question rows.' }
  }

  const questions: ExamQuestion[] = []
  const rowErrors: string[] = []
  result.data.forEach((row, index) => {
    const rowNumber = index + 2
    const question = (row.question || '').trim()
    const optionA = (row.optionA || '').trim()
    const optionB = (row.optionB || '').trim()
    const optionC = (row.optionC || '').trim()
    const optionD = (row.optionD || '').trim()
    const correctAnswer = (row.correctAnswer || '').trim().toUpperCase()
    const explanation = (row.explanation || '').trim()
    if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      rowErrors.push(`row ${rowNumber}: missing required value(s)`)
      return
    }
    if (!VALID_ANSWERS.has(correctAnswer)) {
      rowErrors.push(
        `row ${rowNumber}: correctAnswer must be A, B, C, or D (got "${row.correctAnswer}")`,
      )
      return
    }
    questions.push({
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer: correctAnswer as ExamQuestion['correctAnswer'],
      ...(explanation ? { explanation } : {}),
    })
  })

  if (rowErrors.length > 0) {
    const preview = rowErrors.slice(0, MAX_ROW_ERRORS_SHOWN).join('; ')
    const more =
      rowErrors.length > MAX_ROW_ERRORS_SHOWN
        ? ` (+${rowErrors.length - MAX_ROW_ERRORS_SHOWN} more)`
        : ''
    return { ok: false, error: `${rowErrors.length} row(s) failed validation: ${preview}${more}.` }
  }
  return { ok: true, questions }
}
