import type { ReactNode } from 'react'

export function BackHeading({
  title,
  onBack,
  label = 'Back',
}: {
  title: ReactNode
  onBack: () => void
  label?: string
}) {
  return (
    <div className="view-heading">
      <button className="back-link" onClick={onBack} aria-label={label} title={label}>
        ←
      </button>
      <h2>{title}</h2>
    </div>
  )
}
