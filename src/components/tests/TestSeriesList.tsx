import type { TestSeries } from '../../core/types'
import { SeriesCover } from './SeriesCover'

export function TestSeriesList({
  canEdit,
  series,
  message,
  onCreate,
  onOpen,
}: {
  canEdit: boolean
  series: TestSeries[]
  message: string
  onCreate: () => void
  onOpen: (item: TestSeries) => void
}) {
  return (
    <div className="stack">
      {!canEdit && (
        <p className="notice">
          Admin access is read-only. Only Super Admins can create or edit test series.
        </p>
      )}
      {message && <p className="notice">{message}</p>}
      {series.length === 0 && (
        <div className="card">
          <p>No test series yet. Create one from your published exams.</p>
        </div>
      )}
      <div className="test-series-grid">
        {series.map((item) => (
          <div
            className="card test-series-card"
            key={item.id}
            onClick={() => onOpen(item)}
            title="Open this test series"
          >
            <div className="series-card-cover">
              <SeriesCover title={item.title} className="test-series-cover-card" />
              <span
                className={`status-dot status-dot-${item.status}`}
                title={item.status === 'published' ? 'Published' : 'Draft'}
              />
              <span className={`price-tag ${item.pricingType === 'paid' ? 'price-paid' : 'price-free'}`}>
                {item.pricingType === 'paid' ? `₹${item.price ?? 0}` : 'Free'}
              </span>
            </div>
            <div className="test-series-card-body">
              <div className="test-series-card-head">
                <h3>{item.title}</h3>
              </div>
              <p className="test-series-card-meta">
                {item.examIds?.length ?? 0} test{item.examIds?.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        ))}
      </div>
      {canEdit && (
        <button className="fab" title="New test series" aria-label="New test series" onClick={onCreate}>
          +
        </button>
      )}
    </div>
  )
}
