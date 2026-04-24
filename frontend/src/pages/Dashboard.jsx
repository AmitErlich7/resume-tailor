import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import { useAppUser } from '../services/appAuth.jsx'
import { getTailorVersions } from '../services/api.js'
import { useProfile } from '../hooks/useProfile.js'

const STATUS_COLORS = {
  draft: { bg: '#fef9c3', color: '#854d0e' },
  approved: { bg: '#dcfce7', color: '#166534' },
  exported: { bg: '#dbeafe', color: '#1e40af' },
  archived: { bg: '#f1f5f9', color: '#64748b' },
}

export default function Dashboard() {
  const { user } = useAppUser()
  const navigate = useNavigate()
  const { profile, loading: profileLoading } = useProfile()
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(true)
  const [versionsError, setVersionsError] = useState(null)

  useEffect(() => {
    getTailorVersions()
      .then(setVersions)
      .catch((err) => setVersionsError(err.message))
      .finally(() => setVersionsLoading(false))
  }, [])

  const completionPct = profile ? calcCompletion(profile) : 0

  return (
    <div style={styles.page}>
      <Nav />
      <main style={styles.main}>
        <div style={styles.greeting}>
          <h1 style={styles.h1}>
            Welcome back, {user?.firstName || 'there'}
          </h1>
          <p style={styles.sub}>Here's your resume tailoring dashboard.</p>
        </div>

        {/* Profile completion */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Profile Completion</span>
            <span style={{ ...styles.badge, background: completionPct === 100 ? '#dcfce7' : '#fef9c3', color: completionPct === 100 ? '#166534' : '#854d0e' }}>
              {completionPct}%
            </span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${completionPct}%` }} />
          </div>
          {completionPct < 100 && (
            <p style={styles.hint}>
              Complete your profile to get the best tailoring results.{' '}
              <button style={styles.textBtn} onClick={() => navigate('/profile')}>
                Edit profile →
              </button>
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div style={styles.actionsRow}>
          <ActionCard
            icon="✏️"
            title="Tailor New Resume"
            desc="Paste a job description and get an AI-tailored resume in minutes."
            onClick={() => navigate('/tailor')}
            primary
          />
          <ActionCard
            icon="👤"
            title="Edit Profile"
            desc="Update your skills, experience, education, and projects."
            onClick={() => navigate('/profile')}
          />
          <ActionCard
            icon="📄"
            title="View All Versions"
            desc="Browse, approve, and export your tailored resumes."
            onClick={() => navigate('/versions')}
          />
        </div>

        {/* Recent versions */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Recent Tailored Resumes</span>
            {versions.length > 0 && (
              <button style={styles.textBtn} onClick={() => navigate('/versions')}>
                View all →
              </button>
            )}
          </div>

          {versionsLoading && <p style={styles.muted}>Loading…</p>}
          {versionsError && <p style={styles.error}>Error: {versionsError}</p>}
          {!versionsLoading && versions.length === 0 && (
            <p style={styles.muted}>No resumes yet. Tailor your first one!</p>
          )}

          {versions.slice(0, 5).map((v) => (
            <div key={v._id} style={styles.versionRow}>
              <div style={styles.versionInfo}>
                <span style={styles.versionTitle}>{v.job_title}</span>
                <span style={styles.versionCompany}> @ {v.company}</span>
              </div>
              <div style={styles.versionMeta}>
                <span style={{ ...styles.badge, ...(STATUS_COLORS[v.status] || {}) }}>
                  {v.status}
                </span>
                <span style={styles.score}>{v.match_score}% match</span>
                <span style={styles.date}>{fmtDate(v.created_at)}</span>
                <button style={styles.textBtn} onClick={() => navigate(`/tailor/${v._id}`)}>
                  View →
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function ActionCard({ icon, title, desc, onClick, primary }) {
  return (
    <div
      style={{
        ...styles.actionCard,
        ...(primary ? styles.actionCardPrimary : {}),
      }}
      onClick={onClick}
    >
      <div style={styles.actionIcon}>{icon}</div>
      <div style={styles.actionTitle}>{title}</div>
      <div style={styles.actionDesc}>{desc}</div>
    </div>
  )
}

function calcCompletion(profile) {
  const checks = [
    !!profile.contact?.name,
    !!profile.contact?.email,
    !!profile.summary,
    (profile.skills?.length || 0) > 0,
    (profile.experiences?.length || 0) > 0,
    (profile.education?.length || 0) > 0,
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const styles = {
  page: { minHeight: '100vh', background: '#f8fafc' },
  main: { maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' },
  greeting: { marginBottom: '28px' },
  h1: { fontSize: '26px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' },
  sub: { color: '#64748b', fontSize: '15px' },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  cardTitle: { fontWeight: '600', fontSize: '16px', color: '#1e293b' },
  badge: {
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
  },
  progressBar: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    background: '#2563eb',
    borderRadius: '4px',
    transition: 'width 0.4s ease',
  },
  hint: { fontSize: '13px', color: '#64748b' },
  textBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    padding: 0,
  },
  actionsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  actionCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  },
  actionCardPrimary: {
    background: '#2563eb',
    border: '1px solid #2563eb',
  },
  actionIcon: { fontSize: '24px', marginBottom: '10px' },
  actionTitle: {
    fontWeight: '600',
    fontSize: '15px',
    color: '#1e293b',
    marginBottom: '6px',
  },
  actionDesc: { fontSize: '13px', color: '#64748b', lineHeight: '1.5' },
  versionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  versionInfo: { flex: 1 },
  versionTitle: { fontWeight: '600', fontSize: '14px', color: '#1e293b' },
  versionCompany: { fontSize: '14px', color: '#64748b' },
  versionMeta: { display: 'flex', alignItems: 'center', gap: '12px' },
  score: { fontSize: '13px', fontWeight: '600', color: '#2563eb' },
  date: { fontSize: '12px', color: '#94a3b8' },
  muted: { color: '#94a3b8', fontSize: '14px' },
  error: { color: '#dc2626', fontSize: '14px' },
}
