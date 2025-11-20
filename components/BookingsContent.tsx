'use client'

import { useState, useEffect } from 'react'
import Navigation from './Navigation'
import { Database } from '@/lib/supabase/database.types'

type Booking = Database['public']['Tables']['bookings']['Row']

export default function BookingsContent() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/admin/bookings')
      if (res.ok) {
        const data = await res.json()
        setBookings(data)
      } else {
        setError('Failed to fetch bookings')
      }
    } catch (err) {
      setError('Failed to load bookings')
    } finally {
      setLoading(false)
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

  const totalCost = bookings.reduce((sum, b) => sum + Number(b.cost), 0)
  const totalPaid = bookings.reduce((sum, b) => sum + Number(b.paid_so_far || 0), 0)
  const totalRemaining = totalCost - totalPaid
  
  // Find upcoming payments
  const today = new Date()
  const upcomingPayments = bookings.filter((b) => {
    if (!b.next_payment_date) return false
    const nextDate = new Date(b.next_payment_date)
    return nextDate >= today
  }).sort((a, b) => {
    const dateA = new Date(a.next_payment_date!).getTime()
    const dateB = new Date(b.next_payment_date!).getTime()
    return dateA - dateB
  })
  
  const overduePayments = bookings.filter((b) => {
    if (!b.next_payment_date) return false
    const nextDate = new Date(b.next_payment_date)
    return nextDate < today
  })

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
              <h1 className="text-3xl font-bold mb-2">Bookings - Admin</h1>
              <p className="text-gray-600">Track expenses and bookings</p>
            </div>
            <Navigation />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Booking Summary</h2>
              <div className="flex gap-6 text-sm text-gray-600 mb-2">
                <span><strong>Total Cost:</strong> {formatCurrency(totalCost)}</span>
                <span><strong>Paid So Far:</strong> {formatCurrency(totalPaid)}</span>
                <span><strong>Remaining:</strong> {formatCurrency(totalRemaining)}</span>
              </div>
              {overduePayments.length > 0 && (
                <div className="text-sm text-red-600 font-semibold">
                  ⚠️ {overduePayments.length} payment{overduePayments.length > 1 ? 's' : ''} overdue
                </div>
              )}
              {upcomingPayments.length > 0 && (
                <div className="text-sm text-yellow-600">
                  📅 {upcomingPayments.length} upcoming payment{upcomingPayments.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {showAddForm ? 'Cancel' : 'Add Booking'}
            </button>
          </div>
          
          {/* Upcoming Payments Alert */}
          {upcomingPayments.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Upcoming Payments</h3>
              <div className="space-y-1">
                {upcomingPayments.slice(0, 5).map((booking) => {
                  const nextDate = new Date(booking.next_payment_date!)
                  const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  const remaining = Number(booking.cost) - Number(booking.paid_so_far || 0)
                  return (
                    <div key={booking.id} className="text-sm text-yellow-700">
                      <strong>{booking.description}</strong> - {formatCurrency(remaining)} due in {daysUntil} day{daysUntil !== 1 ? 's' : ''} ({nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Overdue Payments Alert */}
          {overduePayments.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2">⚠️ Overdue Payments</h3>
              <div className="space-y-1">
                {overduePayments.map((booking) => {
                  const nextDate = new Date(booking.next_payment_date!)
                  const daysOverdue = Math.ceil((today.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
                  const remaining = Number(booking.cost) - Number(booking.paid_so_far || 0)
                  return (
                    <div key={booking.id} className="text-sm text-red-700">
                      <strong>{booking.description}</strong> - {formatCurrency(remaining)} overdue by {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} (was due {nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {showAddForm && <AddBookingForm onSuccess={() => {
            setShowAddForm(false)
            fetchBookings()
          }} />}

          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Description</th>
                  <th className="text-left py-2 px-4">Location</th>
                  <th className="text-left py-2 px-4">Total Cost</th>
                  <th className="text-left py-2 px-4">Paid So Far</th>
                  <th className="text-left py-2 px-4">Remaining</th>
                  <th className="text-left py-2 px-4">First Payment</th>
                  <th className="text-left py-2 px-4">Next Payment</th>
                  <th className="text-left py-2 px-4">Notes</th>
                  <th className="text-left py-2 px-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-gray-600">
                      No bookings yet
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const cost = Number(booking.cost)
                    const paid = Number(booking.paid_so_far || 0)
                    const remaining = cost - paid
                    const nextPaymentDate = booking.next_payment_date ? new Date(booking.next_payment_date) : null
                    const today = new Date()
                    const isPaymentDue = nextPaymentDate && nextPaymentDate <= today
                    const isPaymentSoon = nextPaymentDate && nextPaymentDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
                    
                    return (
                      <tr key={booking.id} className="border-b">
                        <td className="py-2 px-4">{booking.description}</td>
                        <td className="py-2 px-4">{booking.location || '-'}</td>
                        <td className="py-2 px-4">{formatCurrency(cost)}</td>
                        <td className="py-2 px-4">
                          <span className={paid >= cost ? 'text-green-600 font-semibold' : ''}>
                            {formatCurrency(paid)}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <span className={remaining <= 0 ? 'text-green-600' : remaining <= cost * 0.5 ? 'text-yellow-600' : 'text-red-600'}>
                            {formatCurrency(remaining)}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          {booking.first_payment_date ? (
                            <span className="text-gray-700">
                              {new Date(booking.first_payment_date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          {nextPaymentDate ? (
                            <span className={isPaymentDue ? 'text-red-600 font-semibold' : isPaymentSoon ? 'text-yellow-600 font-semibold' : 'text-gray-700'}>
                              {nextPaymentDate.toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {isPaymentDue && ' (Due)'}
                              {isPaymentSoon && !isPaymentDue && ' (Soon)'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-4">{booking.notes || '-'}</td>
                        <td className="py-2 px-4">{formatDate(booking.created_at)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddBookingForm({ onSuccess }: { onSuccess: () => void }) {
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [cost, setCost] = useState('')
  const [paidSoFar, setPaidSoFar] = useState('0')
  const [firstPaymentDate, setFirstPaymentDate] = useState('')
  const [nextPaymentDate, setNextPaymentDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          location: location || null,
          cost: parseFloat(cost),
          paid_so_far: parseFloat(paidSoFar) || 0,
          first_payment_date: firstPaymentDate || null,
          next_payment_date: nextPaymentDate || null,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add booking')
      }

      setDescription('')
      setLocation('')
      setCost('')
      setPaidSoFar('0')
      setFirstPaymentDate('')
      setNextPaymentDate('')
      setNotes('')
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
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            What is it? <span className="text-red-500">*</span>
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Hotel booking, Activity, etc."
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Where?
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Bournemouth, Hotel name, etc."
          />
        </div>
        <div>
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
            Total Cost <span className="text-red-500">*</span>
          </label>
          <input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 900"
          />
        </div>
        <div>
          <label htmlFor="paidSoFar" className="block text-sm font-medium text-gray-700 mb-1">
            Paid So Far
          </label>
          <input
            id="paidSoFar"
            type="number"
            step="0.01"
            min="0"
            value={paidSoFar}
            onChange={(e) => setPaidSoFar(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 150 (deposit)"
          />
        </div>
        <div>
          <label htmlFor="firstPaymentDate" className="block text-sm font-medium text-gray-700 mb-1">
            First Payment Date
          </label>
          <input
            id="firstPaymentDate"
            type="date"
            value={firstPaymentDate}
            onChange={(e) => setFirstPaymentDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="nextPaymentDate" className="block text-sm font-medium text-gray-700 mb-1">
            Next Payment Date
          </label>
          <input
            id="nextPaymentDate"
            type="date"
            value={nextPaymentDate}
            onChange={(e) => setNextPaymentDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Who paid, reference numbers, etc."
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Adding...' : 'Add Booking'}
      </button>
    </form>
  )
}

