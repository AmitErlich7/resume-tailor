import Nav from '../components/Nav.jsx'
import { AppUserProfile } from '../services/appAuth.jsx'

export default function Account() {
  return (
    <div style={styles.page}>
      <Nav />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Account Settings</h1>
          <p style={styles.subtitle}>
            Manage your sign-in methods, profile details, and account security.
          </p>
        </div>

        <div style={styles.profileWrap}>
          <AppUserProfile
            path="/account"
            routing="path"
            appearance={{
              elements: {
                card: {
                  width: '100%',
                  boxShadow: 'none',
                  border: '1px solid #e2e8f0',
                },
              },
            }}
          />
        </div>
      </main>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f8fafc' },
  main: { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' },
  header: { marginBottom: '24px' },
  title: {
    margin: '0 0 6px',
    fontSize: '28px',
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    margin: 0,
    fontSize: '15px',
    color: '#64748b',
  },
  profileWrap: {
    background: '#ffffff',
    borderRadius: '16px',
  },
}
