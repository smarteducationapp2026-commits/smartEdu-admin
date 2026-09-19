import './shared.css'
import type { ExamQuestion } from '../../core/types'
import { IconButton } from './IconButton'

const OPTIONS = [
  ['A', 'optionA'],
  ['B', 'optionB'],
  ['C', 'optionC'],
  ['D', 'optionD'],
] as const

export function QuestionCard({
  question,
  index,
  onEdit,
}: {
  question: ExamQuestion
  index: number
  onEdit?: () => void
}) {
  return (
    <div className="question-card">
      <div className="question-card-head">
        <p className="question-index">Question {index + 1}</p>
        {onEdit && <IconButton icon="✎" label="Edit question" onClick={onEdit} />}
      </div>
      <p className="question-text">{question.question}</p>
      <div className="option-list">
        {OPTIONS.map(([letter, field]) => (
          <div
            key={letter}
            className={`option-row ${question.correctAnswer === letter ? 'correct' : ''}`}
          >
            <span className="option-letter">{letter}</span>
            <span className="option-text">{question[field]}</span>
            {question.correctAnswer === letter && <span className="option-check">✓</span>}
          </div>
        ))}
      </div>
      {question.explanation && (
        <p className="question-explanation">
          <strong>Explanation:</strong> {question.explanation}
        </p>
      )}
    </div>
  )
}
