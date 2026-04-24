import { Link, useLocation } from 'react-router-dom'
import { AppUserButton, useAppUser } from '../services/appAuth.jsx'

const NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/profile', label: 'Profile' },
  { path: '/account', label: 'Account' },
  { path: '/tailor', label: 'Tailor Resume' },
  { path: '/versions', label: 'Versions' },
]

export default function Nav() {
  const { pathname } = useLocation()
  const { user } = useAppUser()

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to="/dashboard" style={styles.brand}>
          <span style={styles.logo}>RT</span>
          <span style={styles.brandName}>Resume Tailor</span>
        </Link>

        <div style={styles.links}>
          {NAV_LINKS.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              style={{
                ...styles.link,
                ...(pathname.startsWith(path) ? styles.activeLink : {}),
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div style={styles.user}>
          <AppUserButton afterSignOutUrl="/login" />
        </div>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  logo: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#2563eb',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
  },
  brandName: {
    fontWeight: '700',
    fontSize: '16px',
    color: '#1e293b',
  },
  links: {
    display: 'flex',
    gap: '4px',
    flex: 1,
  },
  link: {
    padding: '6px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    transition: 'background 0.15s, color 0.15s',
  },
  activeLink: {
    background: '#eff6ff',
    color: '#2563eb',
  },
  user: {
    marginLeft: 'auto',
  },
}
