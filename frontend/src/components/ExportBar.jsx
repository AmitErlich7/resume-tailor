/**
 * ExportBar — shown after a resume is approved.
 * Provides DOCX and PDF export buttons with download handling.
 */
import { useState } from 'react'
import { downloadBlob, exportDocx, exportPdf } from '../services/api.js'

export default function ExportBar({ resumeId, status }) {
  const [docxLoading, setDocxLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState(null)

  if (status !== 'approved' && status !== 'exported') return null

  const handleDocx = async () => {
    setDocxLoading(true)
    setError(null)
    try {
      const { blob, filename } = await exportDocx(resumeId)
      downloadBlob(blob, filename)
    } catch (err) {
      setError(err.message)
    } finally {
      setDocxLoading(false)
    }
  }

  const handlePdf = async () => {
    setPdfLoading(true)
    setError(null)
    try {
      const { blob, filename } = await exportPdf(resumeId)
      downloadBlob(blob, filename)
    } catch (err) {
      setError(err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div style={e.bar}>
      <div style={e.left}>
        <span style={e.tick}>✓</span>
        <div>
          <div style={e.approvedLabel}>Resume Approved</div>
          <div style={e.hint}>Download your ATS-compliant resume below.</div>
        </div>
      </div>
      <div style={e.right}>
        {error && <span style={e.error}>{error}</span>}
        <button
          data-testid="download-docx"
          style={{ ...e.btn, ...e.btnDocx, opacity: docxLoading ? 0.6 : 1 }}
          onClick={handleDocx}
          disabled={docxLoading}
        >
          {docxLoading ? 'Generating…' : '⬇ Download DOCX'}
        </button>
        <button
          data-testid="download-pdf"
          style={{ ...e.btn, ...e.btnPdf, opacity: pdfLoading ? 0.6 : 1 }}
          onClick={handlePdf}
          disabled={pdfLoading}
        >
          {pdfLoading ? 'Generating…' : '⬇ Download PDF'}
        </button>
      </div>
    </div>
  )
}

const e = {
  bar: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  left: { display: 'flex', alignItems: 'center', gap: '14px' },
  tick: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#16a34a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  approvedLabel: { fontWeight: '700', fontSize: '15px', color: '#166534' },
  hint: { fontSize: '13px', color: '#4ade80' },
  right: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  error: { fontSize: '13px', color: '#dc2626' },
  btn: {
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnDocx: { background: '#2563eb', color: '#fff' },
  btnPdf: { background: '#1e293b', color: '#fff' },
}
