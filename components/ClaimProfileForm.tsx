'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  full_name: string
}

export default function ClaimProfileForm() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles/unclaimed')
      if (!res.ok) throw new Error('Failed to fetch profiles')
      const data = await res.json()
      setProfiles(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfileId) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/profile/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedProfileId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.details || data.error || 'Failed to claim profile')
      }

      // Wait a moment for the database to update, then redirect
      await new Promise(resolve => setTimeout(resolve, 500))
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center">Loading...</div>
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center text-gray-600">
        No available profiles found. Please contact an administrator.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="profile" className="block text-sm font-medium text-gray-700 mb-1">
          Your Name
        </label>
        <select
          id="profile"
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select your name...</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting || !selectedProfileId}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Claiming...' : 'This is me'}
      </button>
    </form>
  )
}

