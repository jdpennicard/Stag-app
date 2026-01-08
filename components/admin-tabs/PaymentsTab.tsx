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
}

export default function PaymentsTab() {
  const [profiles, setProfiles] = useState<ProfileWithPayments[]>([])
  const [pendingPayments, setPendingPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPayment, setShowAddPayment] = useState(false)
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
      const [profilesRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/profiles'),
        fetch('/api/admin/pending-payments'),
      ])

      if (!profilesRes.ok) {
        const errorData = await profilesRes.json().catch(() => ({}))
        setError(errorData.error || 'Failed to fetch profiles')
        return
      }

      const profilesData = await profilesRes.json()
      const profilesWithPercent = profilesData.map((profile: any) => {
        const totalDue = Number(profile.total_due) || 0
        const confirmedTotal = profile.confirmed_total || 0
        const percentPaid = totalDue > 0 ? (confirmedTotal / totalDue) * 100 : 100
        return { ...profile, percent_paid: Math.round(percentPaid * 100) / 100 }
      })
      setProfiles(profilesWithPercent)

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        setPendingPayments(paymentsData)
      }
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
                <th className="text-left py-2 px-4">Confirmed Paid</th>
                <th className="text-left py-2 px-4">% Paid</th>
                <th className="text-left py-2 px-4">Remaining</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b">
                  <td className="py-2 px-4">{profile.full_name}</td>
                  <td className="py-2 px-4">{formatCurrency(Number(profile.total_due))}</td>
                  <td className="py-2 px-4">{formatCurrency(profile.confirmed_total)}</td>
                  <td className="py-2 px-4">
                    <span className={`font-semibold ${profile.percent_paid >= 100 ? 'text-green-600' : profile.percent_paid >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {profile.percent_paid.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 px-4">{formatCurrency(profile.remaining)}</td>
                  <td className="py-2 px-4">
                    <a
                      href={`/admin/payments?profile=${profile.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit Payments
                    </a>
                  </td>
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

