import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSignIn, useAppUser } from '../services/appAuth.jsx'
import { syncUser } from '../services/api.js'

export default function Login() {
  const { isSignedIn, user, isLoaded } = useAppUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Sync the user to MongoDB after Clerk auth
      const provider =
        user.externalAccounts?.[0]?.provider || 'google'
      syncUser({
        clerk_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || '',
        avatar: user.imageUrl || '',
        provider,
      }).catch(() => {
        // Non-fatal: user can still use the app even if sync fails temporarily
      })
      navigate('/dashboard', { replace: true })
    }
  }, [isLoaded, isSignedIn, user, navigate])

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>RT</div>
          <h1 style={styles.title}>Resume Tailor</h1>
          <p style={styles.subtitle}>
            AI-powered resumes that pass ATS — without fabricating a word.
          </p>
        </div>

        <AppSignIn
          appearance={{
            elements: {
              rootBox: { width: '100%' },
              card: {
                boxShadow: 'none',
                border: 'none',
                padding: '0',
                width: '100%',
              },
              headerTitle: { display: 'none' },
              headerSubtitle: { display: 'none' },
              socialButtonsBlockButton: {
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                padding: '10px 16px',
                marginBottom: '8px',
              },
              dividerRow: { margin: '16px 0' },
              formFieldInput: {
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
              },
              formButtonPrimary: {
                background: '#2563eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
              },
              footerAction: { display: 'none' },
            },
          }}
          redirectUrl="/dashboard"
          routing="hash"
        />

        <p style={styles.note}>
          By signing in, you agree that the AI enhances your profile only with
          information you provide. No fabrication, ever.
        </p>
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
    background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
    padding: '24px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    background: '#2563eb',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  note: {
    marginTop: '24px',
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: '1.5',
  },
}
