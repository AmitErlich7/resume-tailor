/**
 * ProfileForm — multi-section profile editor.
 * Each section is saved independently via PATCH /profile/{section}.
 */
import { useState } from 'react'
import { patchSection } from '../services/api.js'

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={f.field}>
      <label style={f.label}>{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={f.input}
      />
    </div>
  )
}

function TextareaField({ label, value, onChange, rows = 4, placeholder }) {
  return (
    <div style={f.field}>
      <label style={f.label}>{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ ...f.input, resize: 'vertical' }}
      />
    </div>
  )
}

function SectionHeader({ title, onSave, saving, saved, error, sectionId }) {
  return (
    <div style={f.sectionHeader}>
      <h3 style={f.sectionTitle}>{title}</h3>
      <div style={f.sectionActions}>
        {error && <span style={f.errTxt}>{error}</span>}
        {saved && <span style={f.savedTxt}>Saved</span>}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={f.saveBtn}
          data-testid={`${sectionId}-save`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function useSectionSave(section, getData) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await patchSection(section, getData())
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return { save, saving, saved, error }
}

// ---------------------------------------------------------------------------
// Contact section
// ---------------------------------------------------------------------------

export function ContactSection({ data, onChange }) {
  const { save, saving, saved, error } = useSectionSave('contact', () => data)

  return (
    <div style={f.section} data-testid="section-contact">
      <SectionHeader title="Contact Information" onSave={save} saving={saving} saved={saved} error={error} sectionId="contact" />
      <div style={f.grid2}>
        <Field label="Full Name" value={data.name} onChange={(v) => onChange({ ...data, name: v })} placeholder="Jane Doe" />
        <Field label="Email" value={data.email} onChange={(v) => onChange({ ...data, email: v })} type="email" placeholder="jane@example.com" />
        <Field label="Phone" value={data.phone} onChange={(v) => onChange({ ...data, phone: v })} placeholder="+1 555 000 0000" />
        <Field label="Location" value={data.location} onChange={(v) => onChange({ ...data, location: v })} placeholder="San Francisco, CA" />
        <Field label="LinkedIn URL" value={data.linkedin} onChange={(v) => onChange({ ...data, linkedin: v })} placeholder="https://linkedin.com/in/..." />
        <Field label="GitHub URL" value={data.github} onChange={(v) => onChange({ ...data, github: v })} placeholder="https://github.com/..." />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary section
// ---------------------------------------------------------------------------

export function SummarySection({ data, onChange }) {
  const { save, saving, saved, error } = useSectionSave('summary', () => data)

  return (
    <div style={f.section} data-testid="section-summary">
      <SectionHeader title="Professional Summary" onSave={save} saving={saving} saved={saved} error={error} sectionId="summary" />
      <TextareaField
        label="Summary"
        value={data}
        onChange={onChange}
        rows={5}
        placeholder="Write a short summary of your professional background and key strengths…"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skills section
// ---------------------------------------------------------------------------

export function SkillsSection({ data, onChange }) {
  const { save, saving, saved, error } = useSectionSave('skills', () => data)
  const [input, setInput] = useState('')

  const addSkill = () => {
    const trimmed = input.trim()
    if (trimmed && !data.includes(trimmed)) {
      onChange([...data, trimmed])
    }
    setInput('')
  }

  const removeSkill = (skill) => onChange(data.filter((s) => s !== skill))

  return (
    <div style={f.section} data-testid="section-skills">
      <SectionHeader title="Skills" onSave={save} saving={saving} saved={saved} error={error} sectionId="skills" />
      <div style={f.tagRow}>
        {data.map((skill) => (
          <span key={skill} style={f.tag}>
            {skill}
            <button onClick={() => removeSkill(skill)} style={f.tagRemove}>×</button>
          </span>
        ))}
      </div>
      <div style={f.addRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSkill()}
          placeholder="Add a skill and press Enter"
          style={{ ...f.input, flex: 1 }}
        />
        <button onClick={addSkill} style={f.addBtn}>Add</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Experience section
// ---------------------------------------------------------------------------

export function ExperienceSection({ data, onChange }) {
  const { save, saving, saved, error } = useSectionSave('experiences', () => data)

  const addExp = () => {
    onChange([...data, {
      id: crypto.randomUUID(),
      company: '', title: '', location: '',
      start_date: '', end_date: '', bullets: [],
    }])
  }

  const updateExp = (id, patch) => onChange(data.map((e) => e.id === id ? { ...e, ...patch } : e))
  const removeExp = (id) => onChange(data.filter((e) => e.id !== id))

  const addBullet = (id) => updateExp(id, { bullets: [...(data.find((e) => e.id === id)?.bullets || []), ''] })
  const updateBullet = (id, idx, val) => {
    const exp = data.find((e) => e.id === id)
    const bullets = [...exp.bullets]
    bullets[idx] = val
    updateExp(id, { bullets })
  }
  const removeBullet = (id, idx) => {
    const exp = data.find((e) => e.id === id)
    updateExp(id, { bullets: exp.bullets.filter((_, i) => i !== idx) })
  }

  return (
    <div style={f.section} data-testid="section-experiences">
      <SectionHeader title="Work Experience" onSave={save} saving={saving} saved={saved} error={error} sectionId="experiences" />
      {data.map((exp) => (
        <div key={exp.id} style={f.expCard}>
          <div style={f.expCardHeader}>
            <span style={f.expTitle}>{exp.title || 'New Role'}{exp.company ? ` @ ${exp.company}` : ''}</span>
            <button onClick={() => removeExp(exp.id)} style={f.removeBtn}>Remove</button>
          </div>
          <div style={f.grid2}>
            <Field label="Job Title" value={exp.title} onChange={(v) => updateExp(exp.id, { title: v })} placeholder="Software Engineer" />
            <Field label="Company" value={exp.company} onChange={(v) => updateExp(exp.id, { company: v })} placeholder="Acme Corp" />
            <Field label="Location" value={exp.location} onChange={(v) => updateExp(exp.id, { location: v })} placeholder="Remote" />
            <div />
            <Field label="Start Date" value={exp.start_date} onChange={(v) => updateExp(exp.id, { start_date: v })} placeholder="Jan 2022" />
            <Field label="End Date" value={exp.end_date} onChange={(v) => updateExp(exp.id, { end_date: v })} placeholder="Present" />
          </div>
          <div style={f.bulletsLabel}>Bullet Points</div>
          {exp.bullets.map((b, i) => (
            <div key={i} style={f.bulletRow}>
              <input
                value={b}
                onChange={(e) => updateBullet(exp.id, i, e.target.value)}
                style={{ ...f.input, flex: 1 }}
                placeholder="Describe an achievement or responsibility…"
              />
              <button onClick={() => removeBullet(exp.id, i)} style={f.removeBtn}>×</button>
            </div>
          ))}
          <button onClick={() => addBullet(exp.id)} style={f.ghostBtn}>+ Add Bullet</button>
        </div>
      ))}
      <button onClick={addExp} style={f.ghostBtn}>+ Add Experience</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Education section
// ---------------------------------------------------------------------------

export function EducationSection({ data, onChange }) {
  const { save, saving, saved, error } = useSectionSave('education', () => data)

  const addEdu = () => onChange([...data, { id: crypto.randomUUID(), school: '', degree: '', field: '', year: '' }])
  const updateEdu = (id, patch) => onChange(data.map((e) => e.id === id ? { ...e, ...patch } : e))
  const removeEdu = (id) => onChange(data.filter((e) => e.id !== id))

  return (
    <div style={f.section} data-testid="section-education">
      <SectionHeader title="Education" onSave={save} saving={saving} saved={saved} error={error} sectionId="education" />
      {data.map((edu) => (
        <div key={edu.id} style={f.expCard}>
          <div style={f.expCardHeader}>
            <span style={f.expTitle}>{edu.degree || 'New Degree'}{edu.school ? ` — ${edu.school}` : ''}</span>
            <button onClick={() => removeEdu(edu.id)} style={f.removeBtn}>Remove</button>
          </div>
          <div style={f.grid2}>
            <Field label="School / University" value={edu.school} onChange={(v) => updateEdu(edu.id, { school: v })} placeholder="MIT" />
            <Field label="Degree" value={edu.degree} onChange={(v) => updateEdu(edu.id, { degree: v })} placeholder="Bachelor of Science" />
            <Field label="Field of Study" value={edu.field} onChange={(v) => updateEdu(edu.id, { field: v })} placeholder="Computer Science" />
            <Field label="Graduation Year" value={edu.year} onChange={(v) => updateEdu(edu.id, { year: v })} placeholder="2020" />
          </div>
        </div>
      ))}
      <button onClick={addEdu} style={f.ghostBtn}>+ Add Education</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Projects section (manual entries; GitHub imports handled by GitHubImport)
// ---------------------------------------------------------------------------

export function ProjectsSection({ data, onChange, onOpenGitHubImport }) {
  const { save, saving, saved, error } = useSectionSave('projects', () => data)

  const addProject = () => onChange([...data, {
    id: crypto.randomUUID(),
    name: '', repo_url: '', tech_stack: [], purpose: '',
    your_role: 'solo_builder', scale: 'personal', key_features: [], source: 'manual',
  }])
  const updateProj = (id, patch) => onChange(data.map((p) => p.id === id ? { ...p, ...patch } : p))
  const removeProj = (id) => onChange(data.filter((p) => p.id !== id))

  return (
    <div style={f.section} data-testid="section-projects">
      <SectionHeader title="Projects" onSave={save} saving={saving} saved={saved} error={error} sectionId="projects" />
      {data.map((proj) => (
        <div key={proj.id} style={f.expCard}>
          <div style={f.expCardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={f.expTitle}>{proj.name || 'New Project'}</span>
              {proj.source === 'github' && (
                <span style={f.ghBadge}>GitHub</span>
              )}
            </div>
            <button onClick={() => removeProj(proj.id)} style={f.removeBtn}>Remove</button>
          </div>
          <div style={f.grid2}>
            <Field label="Project Name" value={proj.name} onChange={(v) => updateProj(proj.id, { name: v })} placeholder="My Awesome App" />
            <Field label="Repo URL (optional)" value={proj.repo_url} onChange={(v) => updateProj(proj.id, { repo_url: v })} placeholder="https://github.com/..." />
            <div style={f.field}>
              <label style={f.label}>Your Role</label>
              <select value={proj.your_role} onChange={(e) => updateProj(proj.id, { your_role: e.target.value })} style={f.select}>
                <option value="solo_builder">Solo Builder</option>
                <option value="contributor">Contributor</option>
                <option value="maintainer">Maintainer</option>
                <option value="team_lead">Team Lead</option>
              </select>
            </div>
            <div style={f.field}>
              <label style={f.label}>Scale</label>
              <select value={proj.scale} onChange={(e) => updateProj(proj.id, { scale: e.target.value })} style={f.select}>
                <option value="personal">Personal</option>
                <option value="team">Team</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>
          <TextareaField
            label="Purpose / Description"
            value={proj.purpose}
            onChange={(v) => updateProj(proj.id, { purpose: v })}
            rows={2}
            placeholder="What does this project do and what problem does it solve?"
          />
          <div style={f.field}>
            <label style={f.label}>Tech Stack (comma-separated)</label>
            <input
              value={(proj.tech_stack || []).join(', ')}
              onChange={(e) => updateProj(proj.id, { tech_stack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              style={f.input}
              placeholder="React, FastAPI, PostgreSQL"
            />
          </div>
          <div style={f.bulletsLabel}>Key Features</div>
          {(proj.key_features || []).map((feat, i) => (
            <div key={i} style={f.bulletRow}>
              <input
                value={feat}
                onChange={(e) => {
                  const kf = [...proj.key_features]
                  kf[i] = e.target.value
                  updateProj(proj.id, { key_features: kf })
                }}
                style={{ ...f.input, flex: 1 }}
                placeholder="Key feature or accomplishment"
              />
              <button
                onClick={() => updateProj(proj.id, { key_features: proj.key_features.filter((_, j) => j !== i) })}
                style={f.removeBtn}
              >×</button>
            </div>
          ))}
          <button
            onClick={() => updateProj(proj.id, { key_features: [...(proj.key_features || []), ''] })}
            style={f.ghostBtn}
          >+ Add Feature</button>
        </div>
      ))}

      <div style={f.addRow}>
        <button onClick={addProject} style={f.ghostBtn}>+ Add Project Manually</button>
        <button onClick={onOpenGitHubImport} style={f.ghostBtnBlue}>Import from GitHub</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles (shared across all sections)
// ---------------------------------------------------------------------------

const f = {
  section: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b' },
  sectionActions: { display: 'flex', alignItems: 'center', gap: '12px' },
  saveBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  savedTxt: { fontSize: '13px', color: '#16a34a', fontWeight: '600' },
  errTxt: { fontSize: '13px', color: '#dc2626', maxWidth: '240px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' },
  input: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    width: '100%',
  },
  select: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#1e293b',
    background: '#fff',
    width: '100%',
  },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: '999px',
    padding: '3px 10px',
    fontSize: '13px',
    fontWeight: '500',
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#93c5fd',
    fontSize: '16px',
    lineHeight: 1,
    padding: 0,
  },
  addRow: { display: 'flex', gap: '12px', alignItems: 'center' },
  addBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  ghostBtn: {
    background: 'none',
    border: '1px dashed #cbd5e1',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
    marginTop: '8px',
  },
  ghostBtnBlue: {
    background: 'none',
    border: '1px dashed #93c5fd',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    color: '#2563eb',
    cursor: 'pointer',
    marginTop: '8px',
    fontWeight: '600',
  },
  expCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    background: '#fafafa',
  },
  expCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  expTitle: { fontWeight: '600', fontSize: '14px', color: '#1e293b' },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  bulletsLabel: { fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px', marginTop: '4px' },
  bulletRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  ghBadge: {
    background: '#f0fdf4',
    color: '#16a34a',
    borderRadius: '4px',
    padding: '1px 6px',
    fontSize: '11px',
    fontWeight: '600',
  },
}
