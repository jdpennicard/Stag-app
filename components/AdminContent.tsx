'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/lib/supabase/database.types'
import Navigation from './Navigation'

type Profile = Database['public']['Tables']['profiles']['Row']
type Payment = Database['public']['Tables']['payments']['Row']

interface ProfileWithPayments extends Profile {
  confirmed_total: number
  remaining: number
  percent_paid: number
}

export default function AdminContent() {
  const [profiles, setProfiles] = useState<ProfileWithPayments[]>([])
  const [pendingPayments, setPendingPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [profilesRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/profiles'),
        fetch('/api/admin/pending-payments'),
      ])

      if (!profilesRes.ok) {
        const errorData = await profilesRes.json().catch(() => ({}))
        const errorMsg = errorData.error || `Failed to fetch profiles (${profilesRes.status})`
        console.error('Failed to fetch profiles:', profilesRes.status, errorData)
        setError(errorMsg)
      } else {
        const profilesData = await profilesRes.json()
        // Calculate percent paid for each profile
        const profilesWithPercent = profilesData.map((profile: any) => {
          const totalDue = Number(profile.total_due) || 0
          const confirmedTotal = profile.confirmed_total || 0
          // If total due is 0, they've paid everything (100%)
          const percentPaid = totalDue > 0 ? (confirmedTotal / totalDue) * 100 : 100
          return { ...profile, percent_paid: Math.round(percentPaid * 100) / 100 }
        })
        setProfiles(profilesWithPercent)
      }

      if (!paymentsRes.ok) {
        const errorData = await paymentsRes.json().catch(() => ({}))
        console.error('Failed to fetch payments:', paymentsRes.status, errorData)
        if (!error) {
          setError(`Failed to fetch payments (${paymentsRes.status})`)
        }
      } else {
        const paymentsData = await paymentsRes.json()
        setPendingPayments(paymentsData)
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err)
      setError(err.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: 'PATCH',
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to confirm payment:', err)
    }
  }

  const handleRejectPayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/reject`, {
        method: 'PATCH',
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to reject payment:', err)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: process.env.NEXT_PUBLIC_STAG_CURRENCY || 'GBP',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Calculate overall progress
  const totalDue = profiles.reduce((sum, p) => sum + Number(p.total_due), 0)
  const totalConfirmed = profiles.reduce((sum, p) => sum + p.confirmed_total, 0)
  const overallPercentPaid = totalDue > 0 ? (totalConfirmed / totalDue) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Payments - Admin</h1>
              <p className="text-gray-600">Manage guests and payments</p>
            </div>
            <Navigation isAdmin={true} />
          </div>
        </div>

        {/* Overall Progress Gauge */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Overall Payment Progress</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Total Confirmed: {formatCurrency(totalConfirmed)}</span>
              <span>Total Due: {formatCurrency(totalDue)}</span>
              <span className="font-bold text-lg">{Math.round(overallPercentPaid * 100) / 100}% Paid</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-8">
              <div
                className="bg-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold transition-all duration-300"
                style={{ width: `${Math.min(overallPercentPaid, 100)}%` }}
              >
                {overallPercentPaid > 10 && `${Math.round(overallPercentPaid * 100) / 100}%`}
              </div>
            </div>
          </div>
        </div>

        {/* Guest Setup & Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Guest Setup & Overview</h2>
            <button
              onClick={() => setShowAddGuest(!showAddGuest)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {showAddGuest ? 'Cancel' : 'Add Guest'}
            </button>
          </div>

          {showAddGuest && <AddGuestForm onSuccess={() => {
            setShowAddGuest(false)
            fetchData()
          }} />}

          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Name</th>
                  <th className="text-left py-2 px-4">Email</th>
                  <th className="text-left py-2 px-4">Total Due</th>
                  <th className="text-left py-2 px-4">Initial Paid</th>
                  <th className="text-left py-2 px-4">Confirmed Paid</th>
                  <th className="text-left py-2 px-4">% Paid</th>
                  <th className="text-left py-2 px-4">Remaining</th>
                  <th className="text-left py-2 px-4">Status</th>
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
                        <td className="py-2 px-4">{formatCurrency(Number(profile.total_due))}</td>
                        <td className="py-2 px-4">
                          {formatCurrency(Number(profile.initial_confirmed_paid))}
                        </td>
                        <td className="py-2 px-4">{formatCurrency(profile.confirmed_total)}</td>
                        <td className="py-2 px-4">
                          <span className={`font-semibold ${profile.percent_paid >= 100 ? 'text-green-600' : profile.percent_paid >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {profile.percent_paid.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-4">{formatCurrency(profile.remaining)}</td>
                        <td className="py-2 px-4">
                          {profile.user_id ? (
                            <span className="text-green-600">Linked</span>
                          ) : (
                            <span className="text-gray-500">Unclaimed</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingProfile(profile.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            {!profile.user_id && (
                              <GenerateSignupLinkButton 
                                profileId={profile.id} 
                                profileName={profile.full_name}
                                onSuccess={fetchData}
                              />
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Payments</h2>
          {pendingPayments.length === 0 ? (
            <p className="text-gray-600">No pending payments.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Guest</th>
                    <th className="text-left py-2 px-4">Email</th>
                    <th className="text-left py-2 px-4">Amount</th>
                    <th className="text-left py-2 px-4">Deadline</th>
                    <th className="text-left py-2 px-4">Note</th>
                    <th className="text-left py-2 px-4">Submitted</th>
                    <th className="text-left py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-2 px-4">{payment.full_name}</td>
                      <td className="py-2 px-4">{payment.email || '-'}</td>
                      <td className="py-2 px-4">{formatCurrency(Number(payment.amount))}</td>
                      <td className="py-2 px-4">{payment.deadline_label || '-'}</td>
                      <td className="py-2 px-4">{payment.note || '-'}</td>
                      <td className="py-2 px-4">{formatDate(payment.created_at)}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmPayment(payment.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleRejectPayment(payment.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
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
    <>
      <td className="py-2 px-4" colSpan={9}>
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs text-gray-600 mb-1">Initial Paid</label>
            <input
              type="number"
              step="0.01"
              value={initialPaid}
              onChange={(e) => setInitialPaid(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
    </>
  )
}

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
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="totalDue" className="block text-sm font-medium text-gray-700 mb-1">
            Total Due <span className="text-red-500">*</span>
          </label>
          <input
            id="totalDue"
            type="number"
            step="0.01"
            min="0"
            value={totalDue}
            onChange={(e) => setTotalDue(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="initialPaid" className="block text-sm font-medium text-gray-700 mb-1">
            Initial Confirmed Paid
          </label>
          <input
            id="initialPaid"
            type="number"
            step="0.01"
            min="0"
            value={initialPaid}
            onChange={(e) => setInitialPaid(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center text-sm font-medium text-gray-700">
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
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Adding...' : 'Add Guest'}
      </button>
    </form>
  )
}

function GenerateSignupLinkButton({ 
  profileId, 
  profileName,
  onSuccess 
}: { 
  profileId: string
  profileName: string
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false)
  const [signupUrl, setSignupUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateLink = async () => {
    setLoading(true)
    setError(null)
    setSignupUrl(null)

    try {
      const res = await fetch('/api/admin/generate-signup-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
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
      onSuccess() // Refresh the data
    } catch (err: any) {
      setError(err.message || 'Failed to generate signup link')
    } finally {
      setLoading(false)
    }
  }

  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    if (signupUrl) {
      try {
        await navigator.clipboard.writeText(signupUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = signupUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  if (signupUrl) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyLink}
          className={`text-sm font-semibold ${
            copied 
              ? 'text-green-600' 
              : 'text-green-600 hover:text-green-800'
          }`}
          title="Click to copy link"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
        <button
          onClick={() => {
            setSignupUrl(null)
            setCopied(false)
          }}
          className="text-gray-500 hover:text-gray-700 text-xs"
          title="Close"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={handleGenerateLink}
        disabled={loading}
        className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50"
        title={`Generate signup link for ${profileName}`}
      >
        {loading ? 'Generating...' : 'Get Link'}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-1 bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  )
}
