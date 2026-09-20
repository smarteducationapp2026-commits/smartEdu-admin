import './shared.css'

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <div className={`search-box ${className}`.trim()}>
      <svg
        className="search-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      {value && !disabled && (
        <button
          type="button"
          className="search-clear"
          aria-label="Clear search"
          title="Clear search"
          onClick={() => onChange('')}
        >
          ×
        </button>
      )}
    </div>
  )
}
