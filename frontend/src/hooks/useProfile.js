import { useEffect, useState } from 'react'
import { getProfile } from '../services/api.js'

export function useProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProfile()
      setProfile(data)
    } catch (err) {
      if (err.status === 404) {
        setProfile(null) // No profile yet — not an error
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  return { profile, loading, error, reload, setProfile }
}
