/**
 * API service layer.
 *
 * All requests attach the Clerk JWT as a Bearer token.
 * All errors are surfaced as thrown Error objects with a human-readable message.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Get the current Clerk session token.
 * This must be called after Clerk has loaded — import useAuth() in components
 * and pass the getToken function down, or use the global window.__clerkGetToken
 * set in main.jsx via ClerkProvider's tokenCache.
 *
 * We use a module-level setter so api.js stays framework-agnostic.
 */
let _getToken = null

export function setTokenProvider(fn) {
  _getToken = fn
}

async function _authHeaders() {
  if (!_getToken) {
    throw new Error('Auth token provider not set. Call setTokenProvider() first.')
  }
  const token = await _getToken()
  if (!token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function request(method, path, body) {
  const headers = await _authHeaders()
  const options = { method, headers }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, options)

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const json = await response.json()
      detail = json.detail || JSON.stringify(json)
      if (typeof detail === 'object') detail = JSON.stringify(detail)
    } catch {
      // ignore parse errors
    }
    const err = new Error(detail)
    err.status = response.status
    throw err
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.blob()
}

// -------------------------------------------------------------------------
// Public (no auth)
// -------------------------------------------------------------------------

export async function healthCheck() {
  const res = await fetch(`${BASE_URL}/health`)
  return res.json()
}

// -------------------------------------------------------------------------
// Auth
// -------------------------------------------------------------------------

export async function syncUser(userData) {
  return request('POST', '/auth/sync', userData)
}

// -------------------------------------------------------------------------
// Profile
// -------------------------------------------------------------------------

export async function getProfile() {
  return request('GET', '/profile')
}

export async function createProfile(profileData) {
  return request('POST', '/profile', profileData)
}

export async function patchSection(section, data) {
  return request('PATCH', `/profile/${section}`, { [section]: data })
}

// -------------------------------------------------------------------------
// GitHub
// -------------------------------------------------------------------------

export async function importGitHubRepo(repoUrl) {
  return request('POST', '/github/import', { repo_url: repoUrl })
}

export async function confirmGitHubProject(project) {
  return request('POST', '/github/confirm', { project })
}

// -------------------------------------------------------------------------
// Tailor
// -------------------------------------------------------------------------

export async function tailorResume(payload) {
  return request('POST', '/tailor', payload)
}

export async function getTailorVersions() {
  return request('GET', '/tailor/versions')
}

export async function getTailorResume(id) {
  return request('GET', `/tailor/${id}`)
}

export async function approveResume(id, flaggedClaimsReviewed = true) {
  return request('PATCH', `/tailor/${id}/approve`, {
    flagged_claims_reviewed: flaggedClaimsReviewed,
  })
}

export async function deleteResume(id) {
  return request('DELETE', `/tailor/${id}`)
}

// -------------------------------------------------------------------------
// Export (returns Blob)
// -------------------------------------------------------------------------

export async function exportDocx(id) {
  const headers = await _authHeaders()
  const response = await fetch(`${BASE_URL}/export/${id}/docx`, {
    method: 'POST',
    headers,
  })
  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const json = await response.json()
      detail = json.detail || JSON.stringify(json)
    } catch {}
    const err = new Error(detail)
    err.status = response.status
    throw err
  }
  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match ? match[1] : 'resume.docx'
  return { blob, filename }
}

export async function exportPdf(id) {
  const headers = await _authHeaders()
  const response = await fetch(`${BASE_URL}/export/${id}/pdf`, {
    method: 'POST',
    headers,
  })
  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const json = await response.json()
      detail = json.detail || JSON.stringify(json)
    } catch {}
    const err = new Error(detail)
    err.status = response.status
    throw err
  }
  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match ? match[1] : 'resume.pdf'
  return { blob, filename }
}

// -------------------------------------------------------------------------
// File download helper
// -------------------------------------------------------------------------

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
