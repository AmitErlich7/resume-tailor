/**
 * GapReport — displays the skill gap analysis from the AI fact-check step.
 *
 * Shows every JD keyword with:
 *  - whether it was found in the profile
 *  - a concrete suggestion for addressing the gap
 *
 * A non-negotiable disclaimer reminds the user only to add genuine skills.
 */
export default function GapReport({ gapReport, matchScore }) {
  if (!gapReport || gapReport.length === 0) return null

  const gaps = gapReport.filter((g) => !g.found_in_profile)
  const matches = gapReport.filter((g) => g.found_in_profile)

  return (
    <div style={g.container}>
      <div style={g.header}>
        <div>
          <h3 style={g.title}>Skill Gap Report</h3>
          <p style={g.subtitle}>
            {gaps.length === 0
              ? 'Your profile covers all keywords in this job description.'
              : `${gaps.length} keyword${gaps.length > 1 ? 's' : ''} in the JD ${gaps.length > 1 ? 'are' : 'is'} not present in your profile.`}
          </p>
        </div>
        <div style={g.scoreWrap}>
          <div style={{ ...g.score, background: scoreColor(matchScore).bg, color: scoreColor(matchScore).text }}>
            {matchScore}%
          </div>
          <div style={g.scoreLabel}>Match Score</div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={g.disclaimer}>
        ⚠️ <strong>Important:</strong> Only add skills to your profile if you genuinely have
        experience with them. Adding skills you do not have is dishonest and may backfire in interviews.
      </div>

      {/* Missing skills */}
      {gaps.length > 0 && (
        <div style={g.section}>
          <div style={g.sectionLabel}>Missing from Your Profile</div>
          {gaps.map((item, i) => (
            <div key={i} style={g.row}>
              <div style={g.rowLeft}>
                <span style={g.missingDot} />
                <span style={g.keyword}>{item.keyword}</span>
              </div>
              <div style={g.suggestion}>{item.suggestion}</div>
            </div>
          ))}
        </div>
      )}

      {/* Matched skills */}
      {matches.length > 0 && (
        <div style={g.section}>
          <div style={g.sectionLabel}>Found in Your Profile</div>
          <div style={g.matchRow}>
            {matches.map((item, i) => (
              <span key={i} style={g.matchBadge}>{item.keyword}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function scoreColor(score) {
  if (score >= 75) return { bg: '#dcfce7', text: '#166534' }
  if (score >= 50) return { bg: '#fef9c3', text: '#854d0e' }
  return { bg: '#fee2e2', text: '#991b1b' }
}

const g = {
  container: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: { fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#64748b' },
  scoreWrap: { textAlign: 'center' },
  score: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700',
    margin: '0 auto 4px',
  },
  scoreLabel: { fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  disclaimer: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#78350f',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  section: { marginBottom: '20px' },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: '10px',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  rowLeft: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' },
  missingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#f87171',
    flexShrink: 0,
  },
  keyword: { fontWeight: '600', fontSize: '14px', color: '#1e293b' },
  suggestion: { fontSize: '13px', color: '#64748b', lineHeight: '1.5', flex: 1 },
  matchRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  matchBadge: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: '999px',
    padding: '3px 10px',
    fontSize: '12px',
    fontWeight: '600',
  },
}
