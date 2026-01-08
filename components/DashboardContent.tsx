'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PaymentForm from './PaymentForm'
import AdminPaymentForm from './AdminPaymentForm'
import Navigation from './Navigation'
import { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Payment = Database['public']['Tables']['payments']['Row']
type Deadline = Database['public']['Tables']['payment_deadlines']['Row']

interface DashboardContentProps {
  profile: Profile
  payments: Payment[]
  deadlines: Deadline[]
  stagDates?: { start_date: string; end_date?: string | null }
  confirmedTotal: number
  pendingTotal: number
  remaining: number
  isAdmin?: boolean
  allProfiles?: Array<{ id: string; user_id: string | null; full_name: string; email: string | null }>
  currentUserId?: string
}

export default function DashboardContent({
  profile,
  payments,
  deadlines,
  stagDates,
  confirmedTotal,
  pendingTotal,
  remaining,
  isAdmin = false,
  allProfiles = [],
  currentUserId,
}: DashboardContentProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showAdminPaymentForm, setShowAdminPaymentForm] = useState(false)
  const router = useRouter()

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: 'PATCH',
      })
      if (res.ok) {
        router.refresh()
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
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to reject payment:', err)
    }
  }

  // Filter payments - if admin, show all; otherwise just their own
  const displayPayments = isAdmin ? payments : payments.filter((p) => p.user_id === currentUserId)
  const myPayments = payments.filter((p) => p.user_id === currentUserId)
  const myPendingTotal = myPayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0)
  const myConfirmedFromPayments = myPayments.filter((p) => p.status === 'confirmed').reduce((sum, p) => sum + Number(p.amount), 0)
  const myConfirmedTotal = Number(profile.initial_confirmed_paid) + myConfirmedFromPayments
  const myRemaining = Number(profile.total_due) - myConfirmedTotal
  
  // For display, always show user's own totals in summary cards
  const displayConfirmedTotal = myConfirmedTotal
  const displayPendingTotal = myPendingTotal
  const displayRemaining = myRemaining

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: process.env.NEXT_PUBLIC_STAG_CURRENCY || 'GBP',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Calculate countdowns
  // Use the first deadline from database, fallback to env var, then default
  const firstDeadline = deadlines && deadlines.length > 0 ? deadlines[0] : null
  const paymentDeadlineDate = firstDeadline?.due_date
    ? new Date(firstDeadline.due_date)
    : process.env.NEXT_PUBLIC_PAYMENT_DEADLINE 
    ? new Date(process.env.NEXT_PUBLIC_PAYMENT_DEADLINE)
    : new Date('2026-02-01')
  
  // Use stag dates from database, fallback to env var, then default
  const stagStartDate = stagDates?.start_date
    ? new Date(stagDates.start_date)
    : process.env.NEXT_PUBLIC_STAG_DATE
    ? new Date(process.env.NEXT_PUBLIC_STAG_DATE)
    : new Date('2026-03-06')
  const stagEndDate = stagDates?.end_date
    ? new Date(stagDates.end_date)
    : null
  
  const today = new Date()
  const daysUntilPaymentDeadline = Math.ceil((paymentDeadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const daysUntilStag = Math.ceil((stagStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "Owen's Stag 2026 - Bournemouth"}
              </h1>
              <p className="text-gray-600">Welcome, {profile.full_name}</p>
            </div>
            <Navigation isAdmin={isAdmin} />
          </div>
        </div>

        {/* Summary Cards - Full Width */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">Total Owed</p>
            <p className="text-2xl font-bold">{formatCurrency(Number(profile.total_due))}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">Confirmed Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(displayConfirmedTotal)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(displayPendingTotal)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">Remaining</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(displayRemaining)}</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Main Content */}
          <div className="space-y-6">

            {/* Bank Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Bank Details</h2>
              <div className="space-y-2 text-gray-700">
                <p>
                  <strong>Account Name:</strong> {process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME || 'N/A'}
                </p>
                <p>
                  <strong>Account Number:</strong>{' '}
                  {process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER || 'N/A'}
                </p>
                <p>
                  <strong>Sort Code:</strong> {process.env.NEXT_PUBLIC_STAG_BANK_SORT_CODE || 'N/A'}
                </p>
                <p className="mt-4 text-sm text-gray-600">
                  {process.env.NEXT_PUBLIC_STAG_PAYMENT_INSTRUCTION || 
                    `Please contact Jake if you have any issue with payments on 07780008028`}
                </p>
              </div>
            </div>

            {/* Payment Submission */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{isAdmin ? 'All Payments' : 'My Payments'}</h2>
                <div className="flex gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => setShowAdminPaymentForm(!showAdminPaymentForm)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                    >
                      {showAdminPaymentForm ? 'Cancel' : 'Add Payment for Guest'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    {showPaymentForm ? 'Cancel' : "I've made a payment"}
                  </button>
                </div>
              </div>

              {showAdminPaymentForm && isAdmin && (
                <div className="mb-4">
                  <AdminPaymentForm
                    currentUserId={currentUserId}
                    onSuccess={() => {
                      setShowAdminPaymentForm(false)
                      router.refresh()
                    }}
                  />
                </div>
              )}

              {showPaymentForm && (
                <div className="mb-4">
                  <PaymentForm
                    onSuccess={() => {
                      setShowPaymentForm(false)
                      router.refresh()
                    }}
                  />
                </div>
              )}

              {displayPayments.length === 0 ? (
                <p className="text-gray-600">No payments submitted yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        {isAdmin && <th className="text-left py-2 px-4">Guest</th>}
                        <th className="text-left py-2 px-4">Amount</th>
                        <th className="text-left py-2 px-4">Status</th>
                        <th className="text-left py-2 px-4">Deadline</th>
                        <th className="text-left py-2 px-4">Note</th>
                        <th className="text-left py-2 px-4">Date</th>
                        {isAdmin && <th className="text-left py-2 px-4">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {displayPayments.map((payment) => {
                        // Find profile by user_id first, then by profile_id (for unlinked profiles)
                        const paymentProfile = isAdmin 
                          ? (payment.user_id 
                              ? allProfiles.find((p) => p.user_id === payment.user_id)
                              : allProfiles.find((p) => p.id === payment.profile_id))
                          : null
                        const isMyPayment = payment.user_id === currentUserId
                        return (
                          <tr key={payment.id} className="border-b">
                            {isAdmin && (
                              <td className="py-2 px-4">
                                {paymentProfile ? (
                                  <span className={isMyPayment ? 'font-semibold' : ''}>
                                    {paymentProfile.full_name}
                                    {isMyPayment && ' (You)'}
                                    {!payment.user_id && ' (Unclaimed)'}
                                  </span>
                                ) : (
                                  'Unknown'
                                )}
                              </td>
                            )}
                            <td className="py-2 px-4">{formatCurrency(Number(payment.amount))}</td>
                            <td className="py-2 px-4">
                              <span
                                className={`px-2 py-1 rounded text-sm ${
                                  payment.status === 'confirmed'
                                    ? 'bg-green-100 text-green-800'
                                    : payment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {payment.status}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              {deadlines.find((d) => d.id === payment.deadline_id)?.label || 'N/A'}
                            </td>
                            <td className="py-2 px-4">{payment.note || '-'}</td>
                            <td className="py-2 px-4">{formatDate(payment.created_at)}</td>
                            {isAdmin && payment.status === 'pending' && (
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
                            )}
                            {isAdmin && payment.status !== 'pending' && <td className="py-2 px-4">-</td>}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Deadlines & Countdowns */}
          <div className="space-y-6">
            {/* Two Separate Countdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Deadline - Left */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-5 text-white">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Payment Deadline</h3>
                    <p className="text-sm text-blue-100 mb-1">Deadline Date</p>
                    <p className="text-lg font-bold">
                      {paymentDeadlineDate.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="border-t border-blue-400 pt-3">
                    <p className="text-sm text-blue-100 mb-1">Days Remaining</p>
                    <p className="text-4xl font-bold">
                      {daysUntilPaymentDeadline <= 0 ? 'Overdue!' : daysUntilPaymentDeadline}
                    </p>
                    {daysUntilPaymentDeadline > 0 && (
                      <p className="text-sm text-blue-100 mt-1">
                        {daysUntilPaymentDeadline === 1 ? 'day' : 'days'} until deadline
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Stag Countdown - Right */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-5 text-white">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Stag Countdown</h3>
                    <p className="text-sm text-purple-100 mb-1">
                      {stagEndDate ? 'Event Dates' : 'Event Date'}
                    </p>
                    <p className="text-lg font-bold">
                      {stagStartDate.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {stagEndDate && stagEndDate.getTime() !== stagStartDate.getTime() && (
                        <> - {stagEndDate.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}</>
                      )}
                    </p>
                  </div>
                  <div className="border-t border-purple-400 pt-3">
                    <p className="text-sm text-purple-100 mb-1">Days Until Stag</p>
                    <p className="text-4xl font-bold">
                      {daysUntilStag}
                    </p>
                    <p className="text-sm text-purple-100 mt-1">
                      {daysUntilStag === 1 ? 'day' : 'days'} to go!
                    </p>
                  </div>
                </div>
                {daysUntilStag <= 30 && (
                  <div className="bg-white/20 rounded-md p-2 mt-3">
                    <p className="text-xs font-semibold text-center">🎉 Getting close!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

