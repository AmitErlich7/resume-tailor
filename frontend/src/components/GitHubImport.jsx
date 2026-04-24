/**
 * GitHubImport — modal for importing a GitHub repo as a project card.
 *
 * Flow:
 *  1. User enters a repo URL
 *  2. POST /github/import — returns a project card preview
 *  3. User reviews / edits the card
 *  4. POST /github/confirm — saves the card to the profile
 */
import { useState } from 'react'
import { confirmGitHubProject, importGitHubRepo } from '../services/api.js'

export default function GitHubImport({ onClose, onImported }) {
  const [step, setStep] = useState('input') // 'input' | 'loading' | 'review' | 'confirming' | 'done'
  const [repoUrl, setRepoUrl] = useState('')
  const [card, setCard] = useState(null)
  const [error, setError] = useState(null)

  const handleImport = async () => {
    if (!repoUrl.trim()) return
    setError(null)
    setStep('loading')
    try {
      const result = await importGitHubRepo(repoUrl.trim())
      setCard({ ...result.project_card, repo_url: result.repo_url })
      setStep('review')
    } catch (err) {
      setError(err.message)
      setStep('input')
    }
  }

  const handleConfirm = async () => {
    setStep('confirming')
    setError(null)
    try {
      const result = await confirmGitHubProject(card)
      onImported(result.project)
      setStep('done')
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err.message)
      setStep('review')
    }
  }

  const updateCard = (key, value) => setCard((prev) => ({ ...prev, [key]: value }))

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>Import from GitHub</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Step 1: URL input */}
        {(step === 'input' || step === 'loading') && (
          <div>
            <p style={s.hint}>
              Paste a public GitHub repository URL. The AI will analyze the README
              and dependencies to extract project details.
            </p>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              placeholder="https://github.com/owner/repo"
              style={s.input}
              disabled={step === 'loading'}
            />
            {error && <p style={s.error}>{error}</p>}
            <div style={s.btnRow}>
              <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
              <button
                style={{ ...s.primaryBtn, opacity: step === 'loading' ? 0.6 : 1 }}
                onClick={handleImport}
                disabled={step === 'loading'}
              >
                {step === 'loading' ? 'Analyzing…' : 'Analyze Repository'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review the extracted card */}
        {(step === 'review' || step === 'confirming') && card && (
          <div>
            <p style={s.hint}>
              Review the AI-extracted project details below. Edit anything that
              needs correcting before saving to your profile.
            </p>

            <div style={s.field}>
              <label style={s.label}>Project Name</label>
              <input value={card.name || ''} onChange={(e) => updateCard('name', e.target.value)} style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Purpose (one sentence)</label>
              <textarea
                value={card.purpose || ''}
                onChange={(e) => updateCard('purpose', e.target.value)}
                style={{ ...s.input, resize: 'vertical' }}
                rows={2}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Tech Stack (comma-separated)</label>
              <input
                value={(card.tech_stack || []).join(', ')}
                onChange={(e) => updateCard('tech_stack', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
                style={s.input}
              />
            </div>
            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.label}>Your Role</label>
                <select value={card.your_role || 'solo_builder'} onChange={(e) => updateCard('your_role', e.target.value)} style={s.select}>
                  <option value="solo_builder">Solo Builder</option>
                  <option value="contributor">Contributor</option>
                  <option value="maintainer">Maintainer</option>
                  <option value="team_lead">Team Lead</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Scale</label>
                <select value={card.scale || 'personal'} onChange={(e) => updateCard('scale', e.target.value)} style={s.select}>
                  <option value="personal">Personal</option>
                  <option value="team">Team</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Key Features (one per line)</label>
              <textarea
                value={(card.key_features || []).join('\n')}
                onChange={(e) => updateCard('key_features', e.target.value.split('\n').filter(Boolean))}
                style={{ ...s.input, resize: 'vertical' }}
                rows={4}
              />
            </div>

            {error && <p style={s.error}>{error}</p>}

            <div style={s.btnRow}>
              <button style={s.cancelBtn} onClick={() => setStep('input')}>← Back</button>
              <button
                style={{ ...s.primaryBtn, opacity: step === 'confirming' ? 0.6 : 1 }}
                onClick={handleConfirm}
                disabled={step === 'confirming'}
              >
                {step === 'confirming' ? 'Saving…' : 'Save to Profile'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={s.done}>
            <div style={s.doneIcon}>✓</div>
            <p style={s.doneText}>Project saved to your profile!</p>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  modalTitle: { fontSize: '20px', fontWeight: '700', color: '#1e293b' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' },
  hint: { fontSize: '14px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' },
  input: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#1e293b',
    width: '100%',
    outline: 'none',
  },
  select: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    background: '#fff',
    width: '100%',
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  btnRow: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' },
  cancelBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '8px 20px',
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
  },
  primaryBtn: {
    background: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
  },
  error: { color: '#dc2626', fontSize: '13px', marginTop: '8px' },
  done: { textAlign: 'center', padding: '32px 0' },
  doneIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: '#dcfce7',
    color: '#16a34a',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  doneText: { fontSize: '16px', fontWeight: '600', color: '#1e293b' },
}
