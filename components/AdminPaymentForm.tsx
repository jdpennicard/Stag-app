'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AdminPaymentFormProps {
  currentUserId?: string
  onSuccess: () => void
}

export default function AdminPaymentForm({ currentUserId, onSuccess }: AdminPaymentFormProps) {
  const [guestId, setGuestId] = useState('')
  const [guests, setGuests] = useState<Profile[]>([])
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGuests()
  }, [])

  const fetchGuests = async () => {
    try {
      const res = await fetch('/api/admin/profiles')
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched guests:', data)
        setGuests(data)
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Failed to fetch guests:', errorData)
        setError(`Failed to load guests: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to fetch guests:', err)
      setError('Failed to load guest list. Please refresh the page.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!guestId) {
      setError('Please select a guest')
      setLoading(false)
      return
    }

    try {
      // Determine if guestId is a user_id or profile_id
      // First try to find by user_id, then by profile id
      const selectedGuest = guests.find((g) => g.user_id === guestId) || guests.find((g) => g.id === guestId)
      if (!selectedGuest) {
        setError('Selected guest not found')
        setLoading(false)
        return
      }

      const requestBody = {
        user_id: selectedGuest.user_id || null, // null if unlinked
        profile_id: selectedGuest.id, // Always include profile_id
        amount: parseFloat(amount),
        paymentDate: paymentDate || null,
        note: note || null,
      }

      console.log('Submitting payment:', requestBody)

      const res = await fetch('/api/admin/add-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const data = await res.json()
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}${data.hint ? ` (${data.hint})` : ''}`
          : data.error || 'Failed to submit payment'
        throw new Error(errorMsg)
      }

      setGuestId('')
      setAmount('')
      setPaymentDate('')
      setNote('')
      onSuccess()
    } catch (err: any) {
      console.error('Payment submission error:', err)
      setError(err.message || 'Failed to submit payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="guest" className="block text-sm font-medium text-gray-700 mb-1">
          Select Guest <span className="text-red-500">*</span>
        </label>
        <select
          id="guest"
          value={guestId}
          onChange={(e) => setGuestId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a guest...</option>
          {guests.length === 0 ? (
            <option value="" disabled>No guests found. Please add guests in the Admin Panel first.</option>
          ) : (
            <>
              {currentUserId && (
                <option value={currentUserId}>Myself ({guests.find((g) => g.user_id === currentUserId)?.full_name || 'You'})</option>
              )}
              {guests
                .filter((g) => {
                  // Show all guests except self
                  if (currentUserId && g.user_id === currentUserId) return false
                  return true
                })
                .map((guest) => {
                  const isUnlinked = !guest.user_id
                  // For linked profiles, use user_id; for unlinked, use profile id
                  // We'll handle both in the submit handler
                  const optionValue = guest.user_id || guest.id
                  return (
                    <option key={guest.id} value={optionValue}>
                      {guest.full_name} {guest.email ? `(${guest.email})` : ''} {isUnlinked ? '(Not signed up yet)' : ''}
                    </option>
                  )
                })}
            </>
          )}
        </select>
        {guests.length > 0 && guests.filter((g) => g.user_id && g.user_id !== currentUserId).length === 0 && (
          <p className="text-sm text-gray-500 mt-1">
            You can add payments for unclaimed guests (marked "Not signed up yet"). They will be linked to their profile.
          </p>
        )}
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount <span className="text-red-500">*</span>
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
          Date (optional)
        </label>
        <input
          id="paymentDate"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
          Note (optional)
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Admin added payment, reference: XYZ"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Add Payment for Guest'}
      </button>
    </form>
  )
}

