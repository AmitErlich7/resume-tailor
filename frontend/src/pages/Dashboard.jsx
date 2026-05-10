import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import { getTailorVersions } from '../services/api.js'
import { useProfile } from '../hooks/useProfile.js'

const STATUS = {
  draft:    { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)',  label: 'Draft' },
  approved: { bg: 'var(--color-success-bg)', text: 'var(--color-success)',  label: 'Approved' },
  exported: { bg: 'var(--color-info-bg)',    text: 'var(--color-info)',     label: 'Exported' },
  archived: { bg: 'var(--color-surface-raised)', text: 'var(--color-text-3)', label: 'Archived' },
}

export default function Dashboard() {
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
  const completionSections = profile ? getSections(profile) : []
  const firstName = profile?.contact?.name?.split(' ')[0] || null

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-main">
        <div className="page-content">

          {/* Page header */}
          <header style={s.header}>
            <div>
              <h1 style={s.h1}>
                {firstName ? `Good to see you, ${firstName}.` : 'Dashboard'}
              </h1>
              <p style={s.sub}>Your resume tailoring workspace.</p>
            </div>
          </header>

          {/* Two-column body */}
          <div className="dash-body">

            {/* Left: resume history */}
            <section style={s.main}>
              <div style={s.sectionHead}>
                <span style={s.sectionTitle}>Resume history</span>
                {versions.length > 0 && (
                  <button style={s.textLink} onClick={() => navigate('/versions')}>
                    View all
                  </button>
                )}
              </div>

              {versionsLoading && <SkeletonList />}

              {!versionsLoading && versions.length === 0 && (
                <EmptyState onCta={() => navigate('/tailor')} />
              )}

              {!versionsLoading && versions.slice(0, 8).map((v) => (
                <VersionRow key={v.id} v={v} onClick={() => navigate(`/tailor/${v.id}`)} />
              ))}
            </section>

            {/* Right: profile + quick action */}
            <aside style={s.aside}>
              <div style={s.asideCard}>
                <div style={s.asideCardHead}>
                  <span style={s.sectionTitle}>Profile</span>
                  <button style={s.textLink} onClick={() => navigate('/profile')}>
                    Edit
                  </button>
                </div>

                {profileLoading ? (
                  <div style={{ height: 80, ...skeletonStyle }} />
                ) : (
                  <>
                    <div style={s.ringRow}>
                      <div style={s.ringWrap}>
                        <ProgressRing pct={completionPct} />
                        <span style={s.ringLabel}>{completionPct}%</span>
                      </div>
                      <div style={s.sectionChecks}>
                        {completionSections.map(({ label, done }) => (
                          <div key={label} style={s.checkRow}>
                            <span style={{ ...s.checkDot, background: done ? 'var(--color-success)' : 'var(--color-border)' }} />
                            <span style={{ ...s.checkLabel, color: done ? 'var(--color-text-2)' : 'var(--color-text-3)' }}>
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {completionPct < 100 && (
                      <button style={s.ghostBtn} onClick={() => navigate('/profile')}>
                        Complete your profile
                      </button>
                    )}
                  </>
                )}
              </div>

              <button className="cta-block" style={s.ctaBlock} onClick={() => navigate('/tailor')}>
                <span style={s.ctaIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 6.2L11 5M12.2 11.8L11 13" />
                    <path d="M3 21l9-9" />
                  </svg>
                </span>
                <span style={s.ctaText}>Tailor a new resume</span>
                <span style={s.ctaArrow}>→</span>
              </button>
            </aside>
          </div>

        </div>
      </main>
    </div>
  )
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function VersionRow({ v, onClick }) {
  const status = STATUS[v.status] || STATUS.archived
  return (
    <div
      className="version-row"
      style={s.row}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div style={s.rowLeft}>
        <span style={s.rowRole}>{v.job_title}</span>
        <span style={s.rowCompany}>{v.company}</span>
      </div>
      <div style={s.rowRight}>
        <span style={{ ...s.score, color: scoreColor(v.match_score) }}>
          {v.match_score}%
        </span>
        <span style={{ ...s.badge, background: status.bg, color: status.text }}>
          {status.label}
        </span>
        <span style={s.date}>{fmtDate(v.created_at)}</span>
        <span className="row-arrow" style={s.viewArrow}>→</span>
      </div>
    </div>
  )
}

function EmptyState({ onCta }) {
  return (
    <div style={s.empty}>
      <div style={s.emptyMark}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      </div>
      <p style={s.emptyTitle}>Your first tailored resume starts here</p>
      <p style={s.emptyHint}>Paste a job description and get an AI-matched resume in minutes.</p>
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ height: '52px', borderRadius: 'var(--radius-md)' }} />
      ))}
    </div>
  )
}

function ProgressRing({ pct, size = 64, stroke = 5 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-accent)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function calcCompletion(profile) {
  const checks = [
    !!profile.contact?.name,
    !!profile.contact?.email,
    !!profile.summary,
    (profile.skills?.length || 0) > 0,
    (profile.experiences?.length || 0) > 0,
    (profile.education?.length || 0) > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function getSections(profile) {
  return [
    { label: 'Contact',    done: !!(profile.contact?.name && profile.contact?.email) },
    { label: 'Summary',    done: !!profile.summary },
    { label: 'Skills',     done: (profile.skills?.length || 0) > 0 },
    { label: 'Experience', done: (profile.experiences?.length || 0) > 0 },
    { label: 'Education',  done: (profile.education?.length || 0) > 0 },
  ]
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function scoreColor(score) {
  if (score >= 75) return 'var(--color-success)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-error)'
}

const skeletonStyle = {
  background: 'linear-gradient(90deg, var(--color-surface-raised) 25%, var(--color-border-subtle) 50%, var(--color-surface-raised) 75%)',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.4s ease-in-out infinite',
  borderRadius: 'var(--radius-md)',
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-8)',
    flexWrap: 'wrap',
    gap: 'var(--space-4)',
  },
  h1: {
    fontFamily: 'var(--font-heading)',
    fontSize: '26px',
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
    marginBottom: 'var(--space-1)',
  },
  sub: {
    fontSize: '14px',
    color: 'var(--color-text-3)',
  },
  main: {},
  aside: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-4)',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--color-text-3)',
  },
  textLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '13px',
    color: 'var(--color-accent)',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    marginBottom: 'var(--space-2)',
    cursor: 'pointer',
    transition: 'box-shadow 0.12s, border-color 0.12s',
    gap: 'var(--space-4)',
  },
  rowLeft: { minWidth: 0 },
  rowRole: {
    display: 'block',
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rowCompany: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--color-text-3)',
    marginTop: '2px',
  },
  rowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flexShrink: 0,
  },
  score: {
    fontSize: '14px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  badge: {
    padding: '2px 9px',
    borderRadius: 'var(--radius-full)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
  date: {
    fontSize: '12px',
    color: 'var(--color-text-3)',
    fontVariantNumeric: 'tabular-nums',
  },
  viewArrow: {
    color: 'var(--color-text-3)',
    fontSize: '14px',
    transition: 'color 0.12s',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: 'var(--space-12) var(--space-8)',
    gap: 'var(--space-3)',
  },
  emptyMark: {
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--space-2)',
  },
  emptyTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  emptyHint: {
    fontSize: '13px',
    color: 'var(--color-text-3)',
    maxWidth: '300px',
    lineHeight: '1.6',
    marginBottom: 'var(--space-2)',
  },
  primaryBtn: {
    background: 'var(--color-accent)',
    color: 'var(--color-surface)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '9px var(--space-5)',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    transition: 'background 0.12s',
    letterSpacing: '-0.01em',
  },
  ghostBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '8px var(--space-4)',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-text-2)',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    width: '100%',
    transition: 'border-color 0.12s',
  },
  asideCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
  },
  asideCardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-4)',
  },
  ringRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-4)',
  },
  ringWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  ringLabel: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--color-text)',
    fontVariantNumeric: 'tabular-nums',
  },
  sectionChecks: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    flex: 1,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  checkDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  checkLabel: {
    fontSize: '12.5px',
    fontWeight: 500,
  },
  ctaBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4) var(--space-5)',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    transition: 'background 0.12s',
    width: '100%',
    textAlign: 'left',
  },
  ctaIcon: { color: 'oklch(97% 0.012 75)', flexShrink: 0 },
  ctaText: {
    flex: 1,
    fontSize: '13.5px',
    fontWeight: 600,
    color: 'oklch(97% 0.012 75)',
    letterSpacing: '-0.01em',
  },
  ctaArrow: {
    fontSize: '16px',
    color: 'oklch(90% 0.06 65)',
  },
  inlineError: {
    background: 'var(--color-error-bg)',
    border: '1px solid oklch(88% 0.08 22)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: '13px',
    color: 'var(--color-error)',
  },
}
