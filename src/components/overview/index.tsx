import { useEffect, useState } from 'react'
import { getOverviewCounts, type OverviewCounts } from '../../services/overview'

export function Overview() {
  const [counts, setCounts] = useState<OverviewCounts>({ users: 0, courses: 0, tests: 0 })
  useEffect(() => {
    void getOverviewCounts().then(setCounts)
  }, [])
  return (
    <div className="grid">
      <div className="stat">
        <span>Total users</span>
        <strong>{counts.users}</strong>
      </div>
      <div className="stat">
        <span>Courses</span>
        <strong>{counts.courses}</strong>
      </div>
      <div className="stat">
        <span>Tests</span>
        <strong>{counts.tests}</strong>
      </div>
      <div className="card">
        <h3>Admin security</h3>
        <p>
          Admin access is controlled by the Firestore profile role. Keep administrator roles limited
          to trusted accounts.
        </p>
      </div>
    </div>
  )
}
