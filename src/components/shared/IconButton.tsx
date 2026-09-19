import type { ReactNode } from 'react'

export function IconButton({
  icon,
  label,
  onClick,
  className = '',
  disabled,
  type = 'button',
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      className={`icon-button ${className}`.trim()}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </button>
  )
}
