import { useState } from 'react'
import type { User } from 'firebase/auth'
import './dashboard.css'
import { signOutAdmin } from '../../services/auth'
import type { AdminUser } from '../../core/types'
import { Avatar } from '../shared/Avatar'
import { Overview } from '../overview'
import { Subjects } from '../subjects'
import { Exams } from '../exams'
import { Users } from '../users'
import { Courses } from '../courses'
import { Tests } from '../tests'
import { Profile } from '../profile'

export function Dashboard({
  user,
  role,
}: {
  user: Pick<User, 'email'>
  role: 'admin' | 'superAdmin'
}) {
  const [section, setSection] = useState<
    'overview' | 'subjects' | 'exams' | 'users' | 'courses' | 'tests' | 'profile'
  >('overview')
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const accountUser = user as AdminUser
  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside>
        <p className="eyebrow sidebar-label">SMARTEDU</p>
        <h2 className="sidebar-label">Admin Console</h2>
        <nav>
          {(
            [
              ['overview', '⌂', 'Overview'],
              ...(role === 'superAdmin' ? [['users', '♙', 'Manage Users'] as const] : []),
              ['subjects', '▦', 'Subjects'] as const,
              ['exams', '▤', 'Exams'] as const,
              ['tests', '✓', 'Test Series'],
            ] as const
          ).map(([key, icon, label]) => (
            <button
              key={key}
              title={label}
              className={section === key ? 'selected' : ''}
              onClick={() => setSection(key)}
            >
              <span className="menu-icon">{icon}</span>
              <span className="sidebar-label">{label}</span>
            </button>
          ))}
        </nav>
        <button className="signout" title="Sign out" onClick={() => void signOutAdmin()}>
          <span className="menu-icon">↪</span>
          <span className="sidebar-label">Sign out</span>
        </button>
      </aside>
      <main className="content">
        <div className="topbar">
          <div className="brand">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Expand side menu' : 'Collapse side menu'}
            >
              {sidebarCollapsed ? '☰' : '‹'}
            </button>
            <span className="brand-mark">S</span>
            <strong>SmartEdu</strong>
            <span className="brand-banner">Admin learning center</span>
          </div>
          <div className="profile-menu">
            <button
              className="profile-trigger"
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
            >
              <Avatar user={accountUser} />
              <span className="profile-name">
                {accountUser.displayName || accountUser.email || 'Admin'}
              </span>
              <span className="chevron">⌄</span>
            </button>
            {profileOpen && (
              <div className="dropdown">
                <button
                  onClick={() => {
                    setSection('profile')
                    setProfileOpen(false)
                  }}
                >
                  Profile
                </button>
                <button onClick={() => void signOutAdmin()}>Logout</button>
              </div>
            )}
          </div>
        </div>
        {section === 'overview' && <Overview />}
        {section === 'subjects' && <Subjects role={role} />}
        {section === 'exams' && <Exams />}
        {section === 'users' && role === 'superAdmin' && <Users />}
        {section === 'courses' && <Courses />}
        {section === 'tests' && <Tests role={role} />}
        {section === 'profile' && (
          <Profile
            user={{
              ...accountUser,
              uid: 'uid' in user && typeof user.uid === 'string' ? user.uid : '',
            }}
          />
        )}
      </main>
    </div>
  )
}
