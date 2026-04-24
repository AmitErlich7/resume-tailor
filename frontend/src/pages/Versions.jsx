/**
 * Versions page — table of all tailored resumes for the current user.
 *
 * Columns: Company, Role, Match Score, Date, Status, Actions
 * Actions: View Diff, Download DOCX, Download PDF, Delete (soft)
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import { deleteResume, downloadBlob, exportDocx, exportPdf, getTailorVersions } from '../services/api.js'

const STATUS_STYLE = {
  draft: { background: '#fef9c3', color: '#854d0e' },
  approved: { background: '#dcfce7', color: '#166534' },
  exported: { background: '#dbeafe', color: '#1e40af' },
  archived: { background: '#f1f5f9', color: '#64748b' },
}

export default function Versions() {
  const navigate = useNavigate()
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState({}) // keyed by id + action

  useEffect(() => {
    getTailorVersions()
      .then(setVersions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const setAction = (id, action, val) =>
    setActionLoading((prev) => ({ ...prev, [`${id}_${action}`]: val }))

  const isAction = (id, action) => !!actionLoading[`${id}_${action}`]

  const handleDocx = async (v) => {
    setAction(v._id, 'docx', true)
    try {
      const { blob, filename } = await exportDocx(v._id)
      downloadBlob(blob, filename)
      setVersions((prev) => prev.map((r) => r._id === v._id ? { ...r, status: 'exported' } : r))
    } catch (err) {
      alert(`Export failed: ${err.message}`)
    } finally {
      setAction(v._id, 'docx', false)
    }
  }

  const handlePdf = async (v) => {
    setAction(v._id, 'pdf', true)
    try {
      const { blob, filename } = await exportPdf(v._id)
      downloadBlob(blob, filename)
      setVersions((prev) => prev.map((r) => r._id === v._id ? { ...r, status: 'exported' } : r))
    } catch (err) {
      alert(`Export failed: ${err.message}`)
    } finally {
      setAction(v._id, 'pdf', false)
    }
  }

  const handleDelete = async (v) => {
    if (!window.confirm(`Archive "${v.job_title} @ ${v.company}"? This is reversible.`)) return
    setAction(v._id, 'del', true)
    try {
      await deleteResume(v._id)
      setVersions((prev) => prev.filter((r) => r._id !== v._id))
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setAction(v._id, 'del', false)
    }
  }

  return (
    <div style={v.page}>
      <Nav />
      <main style={v.main}>
        <div style={v.header}>
          <h1 style={v.h1}>Tailored Resumes</h1>
          <button style={v.newBtn} onClick={() => navigate('/tailor')}>
            + Tailor New Resume
          </button>
        </div>

        {loading && <div style={v.spinner} />}
        {error && <div style={v.error}>{error}</div>}

        {!loading && versions.length === 0 && (
          <div style={v.empty}>
            <p style={v.emptyText}>No tailored resumes yet.</p>
            <button style={v.newBtn} onClick={() => navigate('/tailor')}>
              Tailor your first resume →
            </button>
          </div>
        )}

        {versions.length > 0 && (
          <div style={v.tableWrap}>
            <table style={v.table}>
              <thead>
                <tr>
                  {['Role', 'Company', 'Match', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} style={v.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {versions.map((r) => (
                  <tr key={r._id} style={v.tr}>
                    <td style={v.td}>
                      <span style={v.roleText}>{r.job_title}</span>
                    </td>
                    <td style={v.td}>{r.company}</td>
                    <td style={v.td}>
                      <span style={{ ...v.score, color: scoreColor(r.match_score) }}>
                        {r.match_score}%
                      </span>
                    </td>
                    <td style={v.td}>
                      <span style={{ ...v.badge, ...(STATUS_STYLE[r.status] || {}) }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={v.td}>{fmtDate(r.created_at)}</td>
                    <td style={v.td}>
                      <div style={v.actions}>
                        <button style={v.actionBtn} onClick={() => navigate(`/tailor/${r._id}`)}>
                          View
                        </button>
                        {(r.status === 'approved' || r.status === 'exported') && (
                          <>
                            <button
                              style={{ ...v.actionBtn, ...v.actionBtnBlue }}
                              onClick={() => handleDocx(r)}
                              disabled={isAction(r._id, 'docx')}
                            >
                              {isAction(r._id, 'docx') ? '…' : 'DOCX'}
                            </button>
                            <button
                              style={{ ...v.actionBtn, ...v.actionBtnDark }}
                              onClick={() => handlePdf(r)}
                              disabled={isAction(r._id, 'pdf')}
                            >
                              {isAction(r._id, 'pdf') ? '…' : 'PDF'}
                            </button>
                          </>
                        )}
                        <button
                          style={{ ...v.actionBtn, ...v.actionBtnRed }}
                          onClick={() => handleDelete(r)}
                          disabled={isAction(r._id, 'del')}
                        >
                          {isAction(r._id, 'del') ? '…' : 'Archive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function scoreColor(score) {
  if (score >= 75) return '#16a34a'
  if (score >= 50) return '#d97706'
  return '#dc2626'
}

const v = {
  page: { minHeight: '100vh', background: '#f8fafc' },
  main: { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  h1: { fontSize: '26px', fontWeight: '700', color: '#1e293b' },
  newBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    margin: '60px auto',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#dc2626',
    fontSize: '14px',
  },
  empty: { textAlign: 'center', padding: '80px 0' },
  emptyText: { fontSize: '16px', color: '#94a3b8', marginBottom: '20px' },
  tableWrap: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#1e293b', verticalAlign: 'middle' },
  roleText: { fontWeight: '600' },
  score: { fontWeight: '700', fontSize: '15px' },
  badge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actions: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  actionBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '5px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
  },
  actionBtnBlue: { borderColor: '#93c5fd', color: '#2563eb' },
  actionBtnDark: { borderColor: '#94a3b8', color: '#1e293b' },
  actionBtnRed: { borderColor: '#fca5a5', color: '#dc2626' },
}
