import mammoth from 'mammoth'
import type { ExamQuestion } from '../../core/types'

export type ParseResult = { ok: true; questions: ExamQuestion[] } | { ok: false; error: string }

// Expected layout: one Word table per question, each a label/value grid —
//   Question | <question text>
//   Type     | Multiple_choice
//   Option   | (a) <option text>   | correct / Incorrect   (one row per option, a–d)
//   Solution | Correct Answer: (x) ... Explanation: <text>
//   Marks    | 1 | 0
// mammoth converts each Word table straight into an HTML <table>, so this is
// parsed as a DOM rather than with regex.
const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D'])
const MAX_ROW_ERRORS_SHOWN = 5

function cellText(cell: Element | undefined): string {
  return (cell?.textContent || '').replace(/\s+/g, ' ').trim()
}

function parseTable(table: HTMLTableElement, index: number): { question?: ExamQuestion; error?: string } {
  const rowNumber = index + 1
  let question = ''
  const options: Record<string, string> = {}
  let correctAnswer = ''
  let explanation = ''

  for (const row of Array.from(table.rows)) {
    const cells = Array.from(row.cells)
    const label = cellText(cells[0]).toLowerCase()
    if (label === 'question') {
      question = cellText(cells[1])
    } else if (label === 'option') {
      const rawText = cellText(cells[1])
      const letterMatch = rawText.match(/^\(([a-dA-D])\)\s*/)
      if (letterMatch) {
        const letter = letterMatch[1].toUpperCase()
        options[letter] = rawText.slice(letterMatch[0].length).trim()
        if (cellText(cells[2]).toLowerCase() === 'correct') correctAnswer = letter
      }
    } else if (label === 'solution') {
      const solutionText = cellText(cells[1])
      explanation = solutionText.includes('Explanation:')
        ? solutionText.split('Explanation:').slice(1).join('Explanation:').trim()
        : solutionText
    }
  }

  if (!question || !options.A || !options.B || !options.C || !options.D || !correctAnswer) {
    return { error: `question ${rowNumber}: missing required value(s)` }
  }
  if (!VALID_ANSWERS.has(correctAnswer)) {
    return { error: `question ${rowNumber}: no option marked "correct"` }
  }

  return {
    question: {
      question,
      optionA: options.A,
      optionB: options.B,
      optionC: options.C,
      optionD: options.D,
      correctAnswer: correctAnswer as ExamQuestion['correctAnswer'],
      ...(explanation ? { explanation } : {}),
    },
  }
}

export async function parseExamQuestionsWord(arrayBuffer: ArrayBuffer): Promise<ParseResult> {
  let html: string
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer })
    html = result.value
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to read the Word document.' }
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tables = Array.from(doc.querySelectorAll('table'))
  if (tables.length === 0) {
    return { ok: false, error: 'No question tables found in this document. Expected one table per question (Question / Type / Option / Solution / Marks rows).' }
  }

  const questions: ExamQuestion[] = []
  const rowErrors: string[] = []
  tables.forEach((table, index) => {
    const { question, error } = parseTable(table as HTMLTableElement, index)
    if (error) rowErrors.push(error)
    else if (question) questions.push(question)
  })

  if (rowErrors.length > 0) {
    const preview = rowErrors.slice(0, MAX_ROW_ERRORS_SHOWN).join('; ')
    const more = rowErrors.length > MAX_ROW_ERRORS_SHOWN ? ` (+${rowErrors.length - MAX_ROW_ERRORS_SHOWN} more)` : ''
    return { ok: false, error: `${rowErrors.length} question(s) failed validation: ${preview}${more}.` }
  }
  if (questions.length === 0) {
    return { ok: false, error: 'No valid questions found in this document.' }
  }
  return { ok: true, questions }
}
