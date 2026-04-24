/**
 * ResumeDiff — split view showing original profile vs tailored resume.
 *
 * Highlight rules:
 *  - unchanged   → no highlight
 *  - reworded    → yellow background
 *  - flagged     → red background + warning icon
 *
 * Each bullet is cross-referenced with source_map to determine its state.
 */

function getTransformation(text, sourceMap, flaggedClaims) {
  if (!text) return 'unchanged'
  const trimmed = text.trim()
  if (flaggedClaims.some((f) => f.trim() === trimmed)) return 'flagged'
  const entry = sourceMap.find((e) => e.output_text?.trim() === trimmed)
  if (entry) return entry.transformation || 'unchanged'
  return 'unchanged'
}

function TextSpan({ text, transformation }) {
  const styles = {
    unchanged: {},
    reworded: { background: '#fef9c3', borderRadius: '3px', padding: '0 2px' },
    reordered: { background: '#e0f2fe', borderRadius: '3px', padding: '0 2px' },
    flagged: {
      background: '#fee2e2',
      borderRadius: '3px',
      padding: '0 2px',
      borderBottom: '2px solid #dc2626',
    },
  }
  return (
    <span style={styles[transformation] || {}}>
      {transformation === 'flagged' && <span title="Flagged: not traceable to original profile">⚠️ </span>}
      {text}
    </span>
  )
}

function SectionHeading({ children }) {
  return <h3 style={sd.sectionHeading}>{children}</h3>
}

function BulletItem({ text, transformation }) {
  return (
    <li style={{ ...sd.bullet, ...(transformation === 'flagged' ? sd.bulletFlagged : transformation === 'reworded' ? sd.bulletReworded : {}) }}>
      <TextSpan text={text} transformation={transformation} />
    </li>
  )
}

// ---------------------------------------------------------------------------
// Original profile panel
// ---------------------------------------------------------------------------

function OriginalPanel({ profile }) {
  const contact = profile.contact || {}
  return (
    <div style={sd.panel}>
      <div style={sd.panelHeader}>
        <span style={sd.panelLabel}>Original Profile</span>
      </div>
      <div style={sd.panelBody}>
        {contact.name && <div style={sd.name}>{contact.name}</div>}

        {profile.summary && (
          <>
            <SectionHeading>Summary</SectionHeading>
            <p style={sd.para}>{profile.summary}</p>
          </>
        )}

        {(profile.skills?.length > 0) && (
          <>
            <SectionHeading>Skills</SectionHeading>
            <p style={sd.para}>{profile.skills.join(', ')}</p>
          </>
        )}

        {(profile.experiences?.length > 0) && (
          <>
            <SectionHeading>Experience</SectionHeading>
            {profile.experiences.map((exp, i) => (
              <div key={exp.id || i} style={sd.expBlock}>
                <div style={sd.expTitle}>{exp.title} — {exp.company}</div>
                <div style={sd.expMeta}>{exp.start_date} – {exp.end_date} {exp.location ? `· ${exp.location}` : ''}</div>
                <ul style={sd.bulletList}>
                  {exp.bullets.map((b, j) => <li key={j} style={sd.bullet}>{b}</li>)}
                </ul>
              </div>
            ))}
          </>
        )}

        {(profile.projects?.length > 0) && (
          <>
            <SectionHeading>Projects</SectionHeading>
            {profile.projects.map((proj, i) => (
              <div key={proj.id || i} style={sd.expBlock}>
                <div style={sd.expTitle}>{proj.name}</div>
                <p style={sd.para}>{proj.purpose}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tailored profile panel
// ---------------------------------------------------------------------------

function TailoredPanel({ tailored, sourceMap, flaggedClaims }) {
  const sm = sourceMap || []
  const fc = flaggedClaims || []

  const summaryT = getTransformation(tailored.summary, sm, fc)

  return (
    <div style={sd.panel}>
      <div style={{ ...sd.panelHeader, background: '#eff6ff' }}>
        <span style={{ ...sd.panelLabel, color: '#2563eb' }}>Tailored Resume</span>
        {fc.length > 0 && (
          <span style={sd.flagBadge}>⚠️ {fc.length} flagged claim{fc.length > 1 ? 's' : ''}</span>
        )}
      </div>
      <div style={sd.panelBody}>
        {tailored.summary && (
          <>
            <SectionHeading>Summary</SectionHeading>
            <p style={{ ...sd.para, ...(summaryT === 'reworded' ? { background: '#fef9c3', borderRadius: '4px', padding: '4px' } : summaryT === 'flagged' ? { background: '#fee2e2', borderRadius: '4px', padding: '4px', borderLeft: '3px solid #dc2626' } : {}) }}>
              {summaryT === 'flagged' && <span>⚠️ </span>}
              {tailored.summary}
            </p>
          </>
        )}

        {(tailored.skills?.length > 0) && (
          <>
            <SectionHeading>Skills</SectionHeading>
            <p style={sd.para}>{tailored.skills.join(', ')}</p>
          </>
        )}

        {(tailored.experiences?.length > 0) && (
          <>
            <SectionHeading>Experience</SectionHeading>
            {tailored.experiences.map((exp, i) => (
              <div key={exp.id || i} style={sd.expBlock}>
                <div style={sd.expTitle}>{exp.title} — {exp.company}</div>
                <div style={sd.expMeta}>{exp.start_date} – {exp.end_date} {exp.location ? `· ${exp.location}` : ''}</div>
                <ul style={sd.bulletList}>
                  {exp.bullets.map((b, j) => {
                    const t = getTransformation(b, sm, fc)
                    return <BulletItem key={j} text={b} transformation={t} />
                  })}
                </ul>
              </div>
            ))}
          </>
        )}

        {(tailored.projects?.length > 0) && (
          <>
            <SectionHeading>Projects</SectionHeading>
            {tailored.projects.map((proj, i) => {
              const t = getTransformation(proj.purpose, sm, fc)
              return (
                <div key={proj.id || i} style={sd.expBlock}>
                  <div style={sd.expTitle}>{proj.name}</div>
                  <p style={sd.para}>
                    <TextSpan text={proj.purpose} transformation={t} />
                  </p>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div style={sd.legend}>
      <span style={sd.legendItem}><span style={{ background: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>No highlight</span> Unchanged</span>
      <span style={sd.legendItem}><span style={{ background: '#fef9c3', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Yellow</span> Reworded</span>
      <span style={sd.legendItem}><span style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>Blue</span> Reordered</span>
      <span style={sd.legendItem}><span style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: '3px', fontSize: '12px', borderBottom: '2px solid #dc2626' }}>⚠️ Red</span> Flagged claim</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function ResumeDiff({ resume, originalProfile }) {
  if (!resume) return null

  return (
    <div>
      <Legend />
      <div style={sd.splitView}>
        <OriginalPanel profile={originalProfile || {}} />
        <TailoredPanel
          tailored={resume.tailored_profile || {}}
          sourceMap={resume.source_map || []}
          flaggedClaims={resume.flagged_claims || []}
        />
      </div>
    </div>
  )
}

const sd = {
  splitView: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginTop: '16px',
  },
  panel: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    overflow: 'hidden',
    background: '#fff',
  },
  panelHeader: {
    background: '#f8fafc',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelLabel: { fontWeight: '700', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  flagBadge: { fontSize: '12px', fontWeight: '600', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '999px' },
  panelBody: { padding: '20px', fontSize: '13px', lineHeight: '1.6', color: '#1e293b', maxHeight: '70vh', overflowY: 'auto' },
  name: { fontSize: '18px', fontWeight: '700', marginBottom: '16px' },
  sectionHeading: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', margin: '16px 0 6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' },
  para: { margin: '0 0 8px', fontSize: '13px', lineHeight: '1.6' },
  expBlock: { marginBottom: '14px' },
  expTitle: { fontWeight: '600', fontSize: '13px', color: '#1e293b' },
  expMeta: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  bulletList: { paddingLeft: '18px', margin: '4px 0' },
  bullet: { marginBottom: '4px', fontSize: '13px' },
  bulletReworded: { background: '#fef9c3', borderRadius: '3px' },
  bulletFlagged: { background: '#fee2e2', borderRadius: '3px' },
  legend: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    padding: '10px 0',
    marginBottom: '4px',
    flexWrap: 'wrap',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' },
}
