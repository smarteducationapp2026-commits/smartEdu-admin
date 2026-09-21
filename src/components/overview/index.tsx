import { useEffect, useState } from 'react'
import { firebaseConfig } from '../../core/firebase'
import { getOverviewCounts, type OverviewCounts } from '../../services/overview'

const APP_VERSION = '1.0.0'

export function Overview() {
  const [counts, setCounts] = useState<OverviewCounts>({
    users: 0,
    subjects: 0,
    exams: 0,
    testSeries: 0,
  })
  useEffect(() => {
    void getOverviewCounts().then(setCounts)
  }, [])
  return (
    <div className="stack">
      <div className="grid12 app-overview">
        <div className="card col-8">
          <h3>Application overview</h3>
          <p>
            SmartEdu is a mobile learning app for exam preparation — subject-wise study
            material, timed test series, and progress tracking, backed by this admin
            console for content and user management.
          </p>
          <dl className="app-overview-facts">
            <div>
              <dt>Version</dt>
              <dd>{APP_VERSION}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>Android</dd>
            </div>
            <div>
              <dt>Firebase project</dt>
              <dd>{firebaseConfig.projectId}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>Spark</dd>
            </div>
          </dl>
        </div>
        <div className="card col-4">
          <h3>Admin security</h3>
          <p>
            Admin access is controlled by the Firestore profile role. Keep administrator
            roles limited to trusted accounts.
          </p>
        </div>
      </div>
      <div className="grid grid-4">
        <div className="stat">
          <span>Total users</span>
          <strong>{counts.users}</strong>
        </div>
        <div className="stat">
          <span>Subjects</span>
          <strong>{counts.subjects}</strong>
        </div>
        <div className="stat">
          <span>Exams</span>
          <strong>{counts.exams}</strong>
        </div>
        <div className="stat">
          <span>Test series</span>
          <strong>{counts.testSeries}</strong>
        </div>
      </div>
    </div>
  )
}
