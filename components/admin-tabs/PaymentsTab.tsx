'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/supabase/database.types'
import AdminPaymentForm from '@/components/AdminPaymentForm'
import { createClient } from '@/lib/supabase/client'

type Profile = Database['public']['Tables']['profiles']['Row']
type Payment = Database['public']['Tables']['payments']['Row']

interface ProfileWithPayments extends Profile {
  confirmed_total: number
  remaining: number
  percent_paid: number
  pending_total: number
}

export default function PaymentsTab() {
  const [profiles, setProfiles] = useState<ProfileWithPayments[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]) // For dropdown
  const [pendingPayments, setPendingPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id)
  }

  const fetchData = async () => {
    try {
      const [profilesRes, paymentsRes, allProfilesRes] = await Promise.all([
        fetch('/api/admin/profiles'),
        fetch('/api/admin/pending-payments'),
        fetch('/api/admin/profiles'), // Get all profiles for dropdown
      ])

      if (!profilesRes.ok) {
        const errorData = await profilesRes.json().catch(() => ({}))
        setError(errorData.error || 'Failed to fetch profiles')
        return
      }

      const profilesData = await profilesRes.json()
      
      // Store all profiles for dropdown
      if (allProfilesRes.ok) {
        const allProfilesData = await allProfilesRes.json()
        setAllProfiles(allProfilesData)
      }

      // Get pending payments
      let pendingPaymentsData: any[] = []
      let rawPendingPayments: any[] = []
      if (paymentsRes.ok) {
        pendingPaymentsData = await paymentsRes.json()
        setPendingPayments(pendingPaymentsData)
        
        // Fetch raw pending payments to get profile_id for accurate matching
        try {
          const supabaseClient = createClient()
          const { data: rawPayments, error: rawError } = await supabaseClient
            .from('payments')
            .select('id, amount, profile_id, user_id')
            .eq('status', 'pending')
          
          if (!rawError && rawPayments) {
            rawPendingPayments = rawPayments
          } else {
            // Fallback: match by name from formatted data
            rawPendingPayments = pendingPaymentsData.map((p: any) => ({
              id: p.id,
              amount: p.amount,
              profile_id: null,
              user_id: null,
              full_name: p.full_name,
            }))
          }
        } catch (err) {
          console.error('Failed to fetch raw pending payments:', err)
          // Fallback: match by name from formatted data
          rawPendingPayments = pendingPaymentsData.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            profile_id: null,
            user_id: null,
            full_name: p.full_name,
          }))
        }
      }

      // Calculate pending total for each profile
      const profilesWithPercent = profilesData.map((profile: any) => {
        const totalDue = Number(profile.total_due) || 0
        const confirmedTotal = profile.confirmed_total || 0
        const percentPaid = totalDue > 0 ? (confirmedTotal / totalDue) * 100 : 100
        
        // Calculate pending payments for this profile
        // Try to match by profile_id/user_id first, then fallback to name matching
        const pendingTotal = rawPendingPayments
          .filter((p: any) => {
            if (p.profile_id === profile.id || (p.user_id && p.user_id === profile.user_id)) {
              return true
            }
            // Fallback: match by name if we don't have profile_id
            if (p.full_name && p.full_name === profile.full_name) {
              return true
            }
            return false
          })
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
        
        return { 
          ...profile, 
          percent_paid: Math.round(percentPaid * 100) / 100,
          pending_total: pendingTotal
        }
      })
      setProfiles(profilesWithPercent)
    } catch (err: any) {
      setError(err.message || 'Failed to load payments')
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
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update profile')
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
      alert('Failed to update profile')
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
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Overall Progress Bar */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Overall Payment Progress</h2>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
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

      {/* Add Payment */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Payment</h2>
          <button
            onClick={() => setShowAddPayment(!showAddPayment)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
          >
            {showAddPayment ? 'Cancel' : 'Add Payment'}
          </button>
        </div>

        {showAddPayment && (
          <AdminPaymentForm
            currentUserId={currentUserId}
            onSuccess={() => {
              setShowAddPayment(false)
              fetchData()
            }}
          />
        )}
      </div>

      {/* Payment Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Payment Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Name</th>
                <th className="text-left py-2 px-4">Total Due</th>
                <th className="text-left py-2 px-4">Pending Payment</th>
                <th className="text-left py-2 px-4">Confirmed Paid</th>
                <th className="text-left py-2 px-4">% Paid</th>
                <th className="text-left py-2 px-4">Remaining</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b">
                  {editingProfile === profile.id ? (
                    <EditPaymentRow
                      profile={profile}
                      allProfiles={allProfiles}
                      onSave={(updates) => handleUpdateProfile(profile.id, updates)}
                      onCancel={() => setEditingProfile(null)}
                    />
                  ) : (
                    <>
                      <td className="py-2 px-4">{profile.full_name}</td>
                      <td className="py-2 px-4">{formatCurrency(Number(profile.total_due))}</td>
                      <td className="py-2 px-4">
                        {profile.pending_total > 0 ? (
                          <span className="text-yellow-600 font-semibold">
                            {formatCurrency(profile.pending_total)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-4">{formatCurrency(profile.confirmed_total)}</td>
                      <td className="py-2 px-4">
                        <span className={`font-semibold ${profile.percent_paid >= 100 ? 'text-green-600' : profile.percent_paid >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {profile.percent_paid.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-4">{formatCurrency(profile.remaining)}</td>
                      <td className="py-2 px-4">
                        <button
                          onClick={() => setEditingProfile(profile.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
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
      <div>
        <h2 className="text-xl font-semibold mb-4">Pending Payments</h2>
        {pendingPayments.length === 0 ? (
          <p className="text-gray-600">No pending payments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Guest</th>
                  <th className="text-left py-2 px-4">Amount</th>
                  <th className="text-left py-2 px-4">Note</th>
                  <th className="text-left py-2 px-4">Submitted</th>
                  <th className="text-left py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="py-2 px-4">{payment.full_name}</td>
                    <td className="py-2 px-4">{formatCurrency(Number(payment.amount))}</td>
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
  )
}

// Edit Payment Row Component
function EditPaymentRow({ 
  profile, 
  allProfiles,
  onSave, 
  onCancel 
}: { 
  profile: ProfileWithPayments
  allProfiles: Profile[]
  onSave: (updates: any) => void
  onCancel: () => void 
}) {
  const [selectedProfileId, setSelectedProfileId] = useState(profile.id)
  const [totalDue, setTotalDue] = useState(profile.total_due.toString())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // If profile changed, update the profile_id (this will require updating payments too)
    // For now, if profile changed, we'll update the current profile's name to match
    // and update total_due
    const selectedProfile = allProfiles.find(p => p.id === selectedProfileId)
    
    // If selecting a different profile, we need to update the name
    // But actually, if they select a different profile, they probably want to reassign
    // For now, let's just update the name and total_due of the current profile
    if (selectedProfileId !== profile.id) {
      // User selected a different profile - update current profile's name to match
      onSave({
        total_due: parseFloat(totalDue),
        full_name: selectedProfile?.full_name || profile.full_name,
      })
    } else {
      // Just updating total_due
      onSave({
        total_due: parseFloat(totalDue),
      })
    }
  }

  return (
    <>
      <td className="py-2 px-4" colSpan={7}>
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Name</label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
            >
              {allProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
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

