import { useEffect, useState } from 'react'
import Nav from '../components/Nav.jsx'
import GitHubImport from '../components/GitHubImport.jsx'
import {
  ContactSection,
  SummarySection,
  SkillsSection,
  ExperienceSection,
  EducationSection,
  ProjectsSection,
} from '../components/ProfileForm.jsx'
import { createProfile } from '../services/api.js'
import { useProfile } from '../hooks/useProfile.js'

const EMPTY_CONTACT = { name: '', email: '', phone: '', linkedin: '', github: '', location: '' }

export default function Profile() {
  const { profile, loading, error: profileError, reload } = useProfile()
  const [showGitHub, setShowGitHub] = useState(false)

  // Local state mirrors the profile document
  const [contact, setContact] = useState(EMPTY_CONTACT)
  const [summary, setSummary] = useState('')
  const [skills, setSkills] = useState([])
  const [experiences, setExperiences] = useState([])
  const [education, setEducation] = useState([])
  const [projects, setProjects] = useState([])
  const [initError, setInitError] = useState(null)
  const [creating, setCreating] = useState(false)

  // Populate local state when the profile loads
  useEffect(() => {
    if (profile) {
      setContact(profile.contact || EMPTY_CONTACT)
      setSummary(profile.summary || '')
      setSkills(profile.skills || [])
      setExperiences(profile.experiences || [])
      setEducation(profile.education || [])
      setProjects(profile.projects || [])
    }
  }, [profile])

  // If no profile exists yet, create an empty one so PATCH calls can upsert
  useEffect(() => {
    if (!loading && !profile && !profileError) {
      setCreating(true)
      createProfile({})
        .then(() => reload())
        .catch((err) => setInitError(err.message))
        .finally(() => setCreating(false))
    }
  }, [loading, profile, profileError])

  const handleGitHubImported = (project) => {
    setProjects((prev) => [...prev, project])
    setShowGitHub(false)
    reload()
  }

  if (loading || creating) {
    return (
      <div style={p.page}>
        <Nav />
        <main style={p.main}>
          <div style={p.spinner} />
        </main>
      </div>
    )
  }

  return (
    <div style={p.page}>
      <Nav />
      <main style={p.main}>
        <div style={p.header}>
          <h1 style={p.h1}>Your Profile</h1>
          <p style={p.sub}>
            Keep this accurate. The AI tailors only what you provide here.
          </p>
        </div>

        {(profileError || initError) && (
          <div style={p.error}>{profileError || initError}</div>
        )}

        <ContactSection data={contact} onChange={setContact} />
        <SummarySection data={summary} onChange={setSummary} />
        <SkillsSection data={skills} onChange={setSkills} />
        <ExperienceSection data={experiences} onChange={setExperiences} />
        <EducationSection data={education} onChange={setEducation} />
        <ProjectsSection
          data={projects}
          onChange={setProjects}
          onOpenGitHubImport={() => setShowGitHub(true)}
        />

        {showGitHub && (
          <GitHubImport
            onClose={() => setShowGitHub(false)}
            onImported={handleGitHubImported}
          />
        )}
      </main>
    </div>
  )
}

const p = {
  page: { minHeight: '100vh', background: '#f8fafc' },
  main: { maxWidth: '860px', margin: '0 auto', padding: '32px 24px' },
  header: { marginBottom: '28px' },
  h1: { fontSize: '26px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' },
  sub: { fontSize: '15px', color: '#64748b' },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    margin: '80px auto',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '20px',
  },
}
