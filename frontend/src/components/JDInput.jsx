/**
 * JDInput — Step 1 of the tailor flow.
 * Collects job description text, job title, and company name.
 */
export default function JDInput({ value, onChange, onSubmit, loading }) {
  const { jdText, jobTitle, company } = value
  const valid = jdText.trim().length > 50 && jobTitle.trim() && company.trim()

  return (
    <div style={s.container}>
      <div style={s.intro}>
        <h2 style={s.h2}>Tailor Your Resume</h2>
        <p style={s.hint}>
          Paste the full job description below. The AI will analyze it and tailor
          your profile to highlight the most relevant experience — using only
          information you've already provided.
        </p>
      </div>

      <div style={s.row2}>
        <div style={s.field}>
          <label style={s.label}>Job Title</label>
          <input
            value={jobTitle}
            onChange={(e) => onChange({ ...value, jobTitle: e.target.value })}
            placeholder="e.g. Senior Software Engineer"
            style={s.input}
            disabled={loading}
          />
        </div>
        <div style={s.field}>
          <label style={s.label}>Company</label>
          <input
            value={company}
            onChange={(e) => onChange({ ...value, company: e.target.value })}
            placeholder="e.g. Acme Corp"
            style={s.input}
            disabled={loading}
          />
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Job Description</label>
        <textarea
          value={jdText}
          onChange={(e) => onChange({ ...value, jdText: e.target.value })}
          placeholder="Paste the full job description here…"
          style={s.textarea}
          rows={16}
          disabled={loading}
        />
        <span style={s.charCount}>{jdText.length} characters</span>
      </div>

      <div style={s.footer}>
        {!valid && (
          <span style={s.validHint}>
            Fill in job title, company, and at least 50 characters of JD to continue.
          </span>
        )}
        <button
          data-testid="tailor-submit"
          style={{ ...s.btn, opacity: valid && !loading ? 1 : 0.5 }}
          disabled={!valid || loading}
          onClick={onSubmit}
        >
          {loading ? 'Tailoring…' : 'Tailor My Resume →'}
        </button>
      </div>
    </div>
  )
}

const s = {
  container: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '32px',
  },
  intro: { marginBottom: '28px' },
  h2: { fontSize: '22px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' },
  hint: { fontSize: '14px', color: '#64748b', lineHeight: '1.6' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' },
  input: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
  },
  textarea: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '14px',
    color: '#1e293b',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.6',
    outline: 'none',
  },
  charCount: { fontSize: '11px', color: '#94a3b8', textAlign: 'right', marginTop: '4px' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' },
  validHint: { fontSize: '13px', color: '#94a3b8' },
  btn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 28px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}
