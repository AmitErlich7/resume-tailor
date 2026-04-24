const requiredVars = [
  'VITE_CLERK_PUBLISHABLE_KEY',
  'VITE_API_BASE_URL',
  'CLERK_JWT_ISSUER',
  'MONGODB_URI',
]

export default function ClerkSetup() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>Clerk setup required</div>
        <h1 style={styles.title}>Authentication is not configured yet.</h1>
        <p style={styles.copy}>
          Add your Clerk and backend environment variables, then restart the
          frontend and backend servers.
        </p>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Frontend `.env.local`</h2>
          <pre style={styles.codeBlock}>
{`VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:8000`}
          </pre>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Backend `.env`</h2>
          <pre style={styles.codeBlock}>
{`MONGODB_URI=mongodb+srv://...
CLERK_JWT_ISSUER=https://your-instance.clerk.accounts.dev
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173`}
          </pre>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Required before sign-in works</h2>
          <ul style={styles.list}>
            {requiredVars.map((variable) => (
              <li key={variable} style={styles.listItem}>
                <code>{variable}</code>
              </li>
            ))}
          </ul>
        </div>

        <a
          href="https://clerk.com/docs/react/getting-started/quickstart"
          target="_blank"
          rel="noreferrer"
          style={styles.link}
        >
          Open Clerk React quickstart
        </a>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background:
      'radial-gradient(circle at top left, #dbeafe 0%, #eff6ff 30%, #f8fafc 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '760px',
    background: '#ffffff',
    border: '1px solid #dbeafe',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
    padding: '32px',
  },
  badge: {
    display: 'inline-block',
    marginBottom: '16px',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  title: {
    margin: '0 0 10px',
    fontSize: '30px',
    lineHeight: 1.15,
    color: '#0f172a',
  },
  copy: {
    margin: '0 0 24px',
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#475569',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 10px',
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
  },
  codeBlock: {
    margin: 0,
    padding: '16px',
    borderRadius: '12px',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: '13px',
    lineHeight: 1.6,
    overflowX: 'auto',
  },
  list: {
    margin: 0,
    paddingLeft: '20px',
    color: '#334155',
  },
  listItem: {
    marginBottom: '8px',
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
    textDecoration: 'none',
  },
}
