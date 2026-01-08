'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Deadline = Database['public']['Tables']['payment_deadlines']['Row']

interface ProfileWithPayments extends Profile {
  confirmed_total: number
  remaining: number
  percent_paid: number
}

export default function AttendeesTab() {
  const [profiles, setProfiles] = useState<ProfileWithPayments[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/profiles')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || 'Failed to fetch profiles')
        return
      }
      const profilesData = await res.json()
      const profilesWithPercent = profilesData.map((profile: any) => {
        const totalDue = Number(profile.total_due) || 0
        const confirmedTotal = profile.confirmed_total || 0
        const percentPaid = totalDue > 0 ? (confirmedTotal / totalDue) * 100 : 100
        return { ...profile, percent_paid: Math.round(percentPaid * 100) / 100 }
      })
      setProfiles(profilesWithPercent)
    } catch (err: any) {
      setError(err.message || 'Failed to load attendees')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (profileId: string, updates: any) => {
    try {
      const res = await fetch(`/api/admin/update-guest/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        setEditingProfile(null)
        fetchData()
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    if (!confirm(`Are you sure you want to delete "${profileName}"? This will permanently delete:\n- The guest profile\n- All associated payments\n- The linked account (if any)\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/delete-guest/${profileId}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete guest')
      }

      fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete guest')
      setTimeout(() => setError(null), 5000)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: process.env.NEXT_PUBLIC_STAG_CURRENCY || 'GBP',
    }).format(amount)
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Attendees</h2>
          <button
            onClick={() => setShowAddGuest(!showAddGuest)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
          >
            {showAddGuest ? 'Cancel' : 'Add Guest'}
          </button>
        </div>

        {showAddGuest && (
          <AddGuestForm onSuccess={() => {
            setShowAddGuest(false)
            fetchData()
          }} />
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Name</th>
                <th className="text-left py-2 px-4">Email</th>
                <th className="text-left py-2 px-4">Account Status</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b">
                  {editingProfile === profile.id ? (
                    <EditGuestRow
                      profile={profile}
                      onSave={(updates) => handleUpdateProfile(profile.id, updates)}
                      onCancel={() => setEditingProfile(null)}
                    />
                  ) : (
                    <>
                      <td className="py-2 px-4">{profile.full_name}</td>
                      <td className="py-2 px-4">{profile.email || '-'}</td>
                      <td className="py-2 px-4">
                        {profile.user_id ? (
                          <span className="text-green-600">Linked</span>
                        ) : (
                          <span className="text-gray-500">Unclaimed</span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <ProfileActionsDropdown
                          profile={profile}
                          onEdit={() => setEditingProfile(profile.id)}
                          onDelete={() => handleDeleteProfile(profile.id, profile.full_name)}
                          onRefresh={fetchData}
                        />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Import the helper components from AdminContent - we'll need to copy them
// For now, let's create simplified versions

function AddGuestForm({ onSuccess }: { onSuccess: () => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [totalDue, setTotalDue] = useState('')
  const [initialPaid, setInitialPaid] = useState('0')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/add-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email: email || null,
          total_due: parseFloat(totalDue),
          initial_confirmed_paid: parseFloat(initialPaid) || 0,
          is_admin: isAdmin,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add guest')
      }

      setFullName('')
      setEmail('')
      setTotalDue('')
      setInitialPaid('0')
      setIsAdmin(false)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4 mt-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Total Due <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={totalDue}
            onChange={(e) => setTotalDue(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Initial Confirmed Paid</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={initialPaid}
            onChange={(e) => setInitialPaid(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="mr-2"
            />
            Make this user an admin
          </label>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Guest'}
      </button>
    </form>
  )
}

function EditGuestRow({ profile, onSave, onCancel }: { profile: ProfileWithPayments, onSave: (updates: any) => void, onCancel: () => void }) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [email, setEmail] = useState(profile.email || '')
  const [totalDue, setTotalDue] = useState(profile.total_due.toString())
  const [initialPaid, setInitialPaid] = useState(profile.initial_confirmed_paid.toString())
  const [isAdmin, setIsAdmin] = useState(profile.is_admin)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      full_name: fullName,
      email: email || null,
      total_due: parseFloat(totalDue),
      initial_confirmed_paid: parseFloat(initialPaid) || 0,
      is_admin: isAdmin,
    })
  }

  return (
    <td className="py-2 px-4" colSpan={4}>
      <form onSubmit={handleSubmit} className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-gray-600 mb-1">Total Due</label>
          <input
            type="number"
            step="0.01"
            value={totalDue}
            onChange={(e) => setTotalDue(e.target.value)}
            required
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-gray-600 mb-1">Initial Paid</label>
          <input
            type="number"
            step="0.01"
            value={initialPaid}
            onChange={(e) => setInitialPaid(e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="mr-2"
            />
            Admin
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </td>
  )
}

function ProfileActionsDropdown({
  profile,
  onEdit,
  onDelete,
  onRefresh,
}: {
  profile: ProfileWithPayments
  onEdit: () => void
  onDelete: () => void
  onRefresh: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false)
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null)
  const [signupLinkLoading, setSignupLinkLoading] = useState(false)
  const [signupUrl, setSignupUrl] = useState<string | null>(null)
  const [signupLinkError, setSignupLinkError] = useState<string | null>(null)
  const [sendLinkLoading, setSendLinkLoading] = useState(false)
  const [sendLinkSuccess, setSendLinkSuccess] = useState(false)
  const [sendLinkError, setSendLinkError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.profile-actions-dropdown')) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  const handleResetPassword = async () => {
    if (!profile.email) return
    if (!confirm(`Send password reset email to ${profile.email}?`)) return

    setResetPasswordLoading(true)
    setResetPasswordError(null)
    setResetPasswordSuccess(false)

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, email: profile.email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send password reset email')
      }

      setResetPasswordSuccess(true)
      setTimeout(() => {
        setResetPasswordSuccess(false)
        setIsOpen(false)
      }, 2000)
    } catch (err: any) {
      setResetPasswordError(err.message)
      setTimeout(() => setResetPasswordError(null), 5000)
    } finally {
      setResetPasswordLoading(false)
    }
  }

  const handleGenerateSignupLink = async () => {
    setSignupLinkLoading(true)
    setSignupLinkError(null)
    setSignupUrl(null)

    try {
      const res = await fetch('/api/admin/generate-signup-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to generate signup link'
        throw new Error(errorMessage)
      }

      const data = await res.json()
      setSignupUrl(data.signupUrl)
      onRefresh()
    } catch (err: any) {
      setSignupLinkError(err.message || 'Failed to generate signup link')
    } finally {
      setSignupLinkLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (signupUrl) {
      try {
        await navigator.clipboard.writeText(signupUrl)
        const originalText = signupUrl
        setSignupUrl('✓ Copied!')
        setTimeout(() => {
          setSignupUrl(originalText)
          setIsOpen(false)
        }, 1500)
      } catch (err) {
        const textArea = document.createElement('textarea')
        textArea.value = signupUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        const originalText = signupUrl
        setSignupUrl('✓ Copied!')
        setTimeout(() => {
          setSignupUrl(originalText)
          setIsOpen(false)
        }, 1500)
      }
    }
  }

  const handleSendSignupLink = async () => {
    if (!profile.email) return
    if (!confirm(`Send signup link to ${profile.email}?`)) return

    setSendLinkLoading(true)
    setSendLinkError(null)
    setSendLinkSuccess(false)

    try {
      const res = await fetch('/api/admin/send-signup-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        const errorMsg = data.error || data.details || 'Failed to send signup link'
        if (errorMsg.includes('template') || errorMsg.includes('not found')) {
          throw new Error(`${errorMsg}. Please create a "Signup Link" template in Email Templates first.`)
        }
        throw new Error(errorMsg)
      }

      const data = await res.json()
      if (data.warning) {
        setSendLinkError(data.warning + (data.error ? `: ${data.error}` : ''))
        if (data.signupUrl) {
          setSignupUrl(data.signupUrl)
        }
        setTimeout(() => setSendLinkError(null), 5000)
      } else {
        setSendLinkSuccess(true)
        if (data.signupUrl) {
          setSignupUrl(data.signupUrl)
        }
        setTimeout(() => {
          setSendLinkSuccess(false)
          setIsOpen(false)
        }, 2000)
      }
      onRefresh()
    } catch (err: any) {
      setSendLinkError(err.message)
      setTimeout(() => setSendLinkError(null), 5000)
    } finally {
      setSendLinkLoading(false)
    }
  }

  return (
    <div className="relative profile-actions-dropdown">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
        title="Actions"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>

            {!profile.user_id && profile.email && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSendSignupLink()
                  }}
                  disabled={sendLinkLoading || sendLinkSuccess}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {sendLinkLoading ? 'Sending...' : sendLinkSuccess ? '✓ Link Sent!' : 'Send Signup Link'}
                </button>
                {signupUrl ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyLink()
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {signupUrl.startsWith('✓') ? signupUrl : 'Copy Link'}
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleGenerateSignupLink()
                    }}
                    disabled={signupLinkLoading}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {signupLinkLoading ? 'Generating...' : 'Get Signup Link'}
                  </button>
                )}
                {sendLinkError && (
                  <div className="px-4 py-2 text-xs text-red-600 bg-red-50">
                    {sendLinkError}
                  </div>
                )}
                {signupLinkError && (
                  <div className="px-4 py-2 text-xs text-red-600 bg-red-50">
                    {signupLinkError}
                  </div>
                )}
              </>
            )}

            {profile.user_id && profile.email && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleResetPassword()
                }}
                disabled={resetPasswordLoading || resetPasswordSuccess}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {resetPasswordLoading ? 'Sending...' : resetPasswordSuccess ? '✓ Sent' : 'Reset Password'}
              </button>
            )}

            {resetPasswordError && (
              <div className="px-4 py-2 text-xs text-red-600 bg-red-50">
                {resetPasswordError}
              </div>
            )}

            <div className="border-t border-gray-200 my-1"></div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

