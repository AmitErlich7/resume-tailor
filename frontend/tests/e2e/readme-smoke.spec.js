import { expect, test } from '@playwright/test'

function createEmptyProfile() {
  return {
    _id: 'profile-1',
    user_id: 'user_test_123',
    contact: {
      name: '',
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      location: '',
    },
    summary: '',
    skills: [],
    experiences: [],
    education: [],
    projects: [],
    updated_at: new Date().toISOString(),
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createResume(state, body) {
  const profile = state.profile || createEmptyProfile()
  const experience = profile.experiences[0] || {
    id: 'exp-1',
    title: 'Software Engineer',
    company: 'Acme',
    location: 'Remote',
    start_date: 'Jan 2022',
    end_date: 'Present',
    bullets: ['Built scalable product features for customers.'],
  }

  return {
    _id: `resume-${state.nextResumeId++}`,
    user_id: 'user_test_123',
    job_title: body.job_title,
    company: body.company,
    jd_text: body.jd_text,
    jd_analysis: {
      required_skills: ['React', 'FastAPI', 'Testing'],
      preferred_skills: ['AWS'],
      responsibilities: ['Build frontend and backend features'],
      seniority: 'mid',
      tech_stack: ['React', 'FastAPI'],
      soft_skills: ['Communication'],
    },
    tailored_profile: {
      summary:
        'Full-stack engineer with a track record of building React and FastAPI products that align closely with role requirements.',
      skills: profile.skills,
      experiences: [
        {
          ...experience,
          bullets: [
            'Reworded customer-facing platform work to match the job description.',
            'Improved delivery quality with test coverage across key resume flows.',
          ],
        },
      ],
      projects: profile.projects,
    },
    source_map: [
      {
        output_section: 'summary',
        output_text:
          'Full-stack engineer with a track record of building React and FastAPI products that align closely with role requirements.',
        source_field: 'summary',
        transformation: 'reworded',
      },
      {
        output_section: 'experiences[0].bullets[0]',
        output_text: 'Reworded customer-facing platform work to match the job description.',
        source_field: 'experiences[0].bullets[0]',
        transformation: 'reworded',
      },
      {
        output_section: 'experiences[0].bullets[1]',
        output_text: 'Improved delivery quality with test coverage across key resume flows.',
        source_field: 'experiences[0].bullets[0]',
        transformation: 'reworded',
      },
    ],
    flagged_claims: [
      'Improved delivery quality with test coverage across key resume flows.',
    ],
    gap_report: [
      {
        keyword: 'AWS',
        found_in_profile: false,
        suggestion: 'Mention AWS only if you have used it directly in past work.',
      },
      {
        keyword: 'React',
        found_in_profile: true,
        suggestion: 'Already covered.',
      },
    ],
    match_score: 82,
    status: 'draft',
    created_at: new Date().toISOString(),
    approved_at: null,
  }
}

async function registerApiMocks(page) {
  const state = {
    profile: null,
    resumes: [],
    nextResumeId: 1,
  }

  await page.route('http://127.0.0.1:8000/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()

    const json = (status, body, headers = {}) =>
      route.fulfill({
        status,
        headers: {
          'content-type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      })

    if (path === '/auth/sync' && method === 'POST') {
      return json(200, {
        _id: 'user-record-1',
        clerk_user_id: 'user_test_123',
        email: 'test.user@example.com',
        name: 'Test User',
        avatar: '',
        provider: ['google'],
      })
    }

    if (path === '/profile' && method === 'GET') {
      if (!state.profile) {
        return json(404, { detail: 'Profile not found' })
      }
      return json(200, clone(state.profile))
    }

    if (path === '/profile' && method === 'POST') {
      const payload = request.postDataJSON() || {}
      state.profile = {
        ...createEmptyProfile(),
        ...payload,
        updated_at: new Date().toISOString(),
      }
      return json(201, clone(state.profile))
    }

    if (path.startsWith('/profile/') && method === 'PATCH') {
      const section = path.split('/').pop()
      const payload = request.postDataJSON() || {}
      state.profile = state.profile || createEmptyProfile()
      state.profile[section] = payload[section]
      state.profile.updated_at = new Date().toISOString()
      return json(200, clone(state.profile))
    }

    if (path === '/tailor/versions' && method === 'GET') {
      return json(
        200,
        clone(state.resumes.filter((resume) => resume.status !== 'archived')),
      )
    }

    if (path === '/tailor' && method === 'POST') {
      const payload = request.postDataJSON()
      const resume = createResume(state, payload)
      state.resumes.unshift(resume)
      return json(200, clone(resume))
    }

    const resumeIdMatch = path.match(/^\/tailor\/([^/]+)$/)
    if (resumeIdMatch && method === 'GET') {
      const resume = state.resumes.find((item) => item._id === resumeIdMatch[1])
      if (!resume) return json(404, { detail: 'Resume not found' })
      return json(200, clone(resume))
    }

    const approveMatch = path.match(/^\/tailor\/([^/]+)\/approve$/)
    if (approveMatch && method === 'PATCH') {
      const resume = state.resumes.find((item) => item._id === approveMatch[1])
      resume.status = 'approved'
      resume.approved_at = new Date().toISOString()
      return json(200, clone(resume))
    }

    const exportMatch = path.match(/^\/export\/([^/]+)\/(docx|pdf)$/)
    if (exportMatch && method === 'POST') {
      const [, resumeId, format] = exportMatch
      const resume = state.resumes.find((item) => item._id === resumeId)
      resume.status = 'exported'
      const filename = `${resume.job_title.toLowerCase().replace(/\s+/g, '_')}_${resume.company
        .toLowerCase()
        .replace(/\s+/g, '_')}_resume.${format}`
      return route.fulfill({
        status: 200,
        headers: {
          'content-type':
            format === 'docx'
              ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              : 'application/pdf',
          'content-disposition': `attachment; filename="${filename}"`,
        },
        body: format === 'docx' ? 'fake-docx-file' : '%PDF-1.4 fake-pdf-file',
      })
    }

    const deleteMatch = path.match(/^\/tailor\/([^/]+)$/)
    if (deleteMatch && method === 'DELETE') {
      const resume = state.resumes.find((item) => item._id === deleteMatch[1])
      resume.status = 'archived'
      return json(200, clone(resume))
    }

    return route.fulfill({
      status: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ detail: `Unhandled mock route: ${method} ${path}` }),
    })
  })
}

test.beforeEach(async ({ page }) => {
  await registerApiMocks(page)
})

test('README smoke flow works end to end', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await page.getByTestId('test-sign-in').click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Profile Completion')).toBeVisible()

  await page.getByRole('link', { name: 'Profile' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByText('Your Profile')).toBeVisible()

  await page.getByPlaceholder('Jane Doe').fill('Test User')
  await page.getByPlaceholder('jane@example.com').fill('test.user@example.com')
  await page.getByPlaceholder('+1 555 000 0000').fill('+1 555 123 4567')
  await page.getByPlaceholder('San Francisco, CA').fill('Remote')
  await page.getByTestId('contact-save').click()
  await expect(page.getByTestId('section-contact').getByText('Saved')).toBeVisible()

  await page
    .getByTestId('section-summary')
    .locator('textarea')
    .fill(
      'Full-stack engineer with experience building React and FastAPI applications for resume and workflow automation.',
    )
  await page.getByTestId('summary-save').click()
  await expect(page.getByTestId('section-summary').getByText('Saved')).toBeVisible()

  const skillsSection = page.getByTestId('section-skills')
  await skillsSection.getByPlaceholder('Add a skill and press Enter').fill('React')
  await skillsSection.getByRole('button', { name: 'Add' }).click()
  await skillsSection.getByPlaceholder('Add a skill and press Enter').fill('FastAPI')
  await skillsSection.getByRole('button', { name: 'Add' }).click()
  await skillsSection.getByPlaceholder('Add a skill and press Enter').fill('Testing')
  await skillsSection.getByRole('button', { name: 'Add' }).click()
  await page.getByTestId('skills-save').click()
  await expect(page.getByTestId('section-skills').getByText('Saved')).toBeVisible()

  await page.getByRole('button', { name: '+ Add Experience' }).click()
  const experienceInputs = page.getByTestId('section-experiences').locator('input')
  await experienceInputs.nth(0).fill('Software Engineer')
  await experienceInputs.nth(1).fill('Acme Labs')
  await experienceInputs.nth(2).fill('Remote')
  await experienceInputs.nth(3).fill('Jan 2022')
  await experienceInputs.nth(4).fill('Present')
  await page.getByRole('button', { name: '+ Add Bullet' }).click()
  await experienceInputs.nth(5).fill(
    'Built customer-facing workflow features with React and FastAPI.',
  )
  await page.getByTestId('experiences-save').click()
  await expect(page.getByTestId('section-experiences').getByText('Saved')).toBeVisible()

  await page.getByRole('link', { name: 'Tailor Resume' }).click()
  await expect(page).toHaveURL(/\/tailor$/)

  await page
    .getByPlaceholder('e.g. Senior Software Engineer')
    .fill('Senior Full-Stack Engineer')
  await page.getByPlaceholder('e.g. Acme Corp').fill('Example Corp')
  await page
    .locator('textarea')
    .first()
    .fill(
      'We are hiring a Senior Full-Stack Engineer with strong React, FastAPI, testing, and AWS experience. The role focuses on building user-facing features, improving quality, and owning delivery across the stack.',
    )
  await page.getByTestId('tailor-submit').click()

  await expect(page.getByText('ATS Match Score')).toBeVisible()
  await expect(page.getByText('Skill Gap Report')).toBeVisible()
  await expect(page.getByText('⚠️ 1 flagged claim').first()).toBeVisible()

  await expect(page.getByTestId('approve-resume')).toBeEnabled()
  await page.getByTestId('approve-resume').click()

  await expect(page.getByText('Resume Approved')).toBeVisible()
  await page.getByTestId('download-docx').click()
  await page.getByTestId('download-pdf').click()

  await page.getByRole('link', { name: 'Versions' }).click()
  await expect(page).toHaveURL(/\/versions$/)
  await expect(page.getByText('Senior Full-Stack Engineer')).toBeVisible()
  await expect(page.getByText('Example Corp')).toBeVisible()
  await expect(page.getByText('exported')).toBeVisible()
})
