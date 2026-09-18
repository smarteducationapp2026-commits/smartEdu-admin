import type { User } from 'firebase/auth'

export function Avatar({ user }: { user: Pick<User, 'photoURL' | 'displayName' | 'email'> }) {
  const nameParts = user.displayName?.trim().split(/\s+/).filter(Boolean) || []
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : (nameParts[0] || user.email || 'A').slice(0, 2)
  return user.photoURL ? <img className="avatar" src={user.photoURL} alt="" /> : <span className="avatar avatar-fallback">{initials.toUpperCase()}</span>
}
