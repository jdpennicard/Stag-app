'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/supabase/database.types'

type Deadline = Database['public']['Tables']['payment_deadlines']['Row']

export default function EventInfoTab() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [stagDates, setStagDates] = useState<{ start_date: string; end_date?: string | null; event_name?: string | null } | null>(null)
  const [eventName, setEventName] = useState<string | null>(null)
  const [editingEventName, setEditingEventName] = useState(false)
  const [editingStagDates, setEditingStagDates] = useState(false)
  const [showAddDeadline, setShowAddDeadline] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [deadlinesRes, stagDatesRes] = await Promise.all([
        fetch('/api/admin/deadlines'),
        fetch('/api/admin/stag-dates'),
      ])

      if (deadlinesRes.ok) {
        const deadlinesData = await deadlinesRes.json()
        setDeadlines(deadlinesData || [])
      }

      if (stagDatesRes.ok) {
        const stagDatesData = await stagDatesRes.json()
        setStagDates(stagDatesData)
        setEventName(stagDatesData?.event_name || null)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Event Name */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Event Name</h2>
          <button
            onClick={() => setEditingEventName(!editingEventName)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
          >
            {editingEventName ? 'Cancel' : 'Edit Name'}
          </button>
        </div>

        {editingEventName ? (
          <EventNameForm
            initialName={eventName || process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "YOUR EVENT NAME"}
            onSuccess={() => {
              setEditingEventName(false)
              fetchData()
            }}
            onCancel={() => setEditingEventName(false)}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <div>
              <span className="text-sm text-gray-600">Event Name: </span>
              <span className="font-semibold">
                {eventName || process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "YOUR EVENT NAME"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stag/Hen Dates */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Stag/Hen Dates</h2>
          <button
            onClick={() => setEditingStagDates(!editingStagDates)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
          >
            {editingStagDates ? 'Cancel' : 'Edit Dates'}
          </button>
        </div>

        {editingStagDates ? (
          <StagDatesForm
            initialDates={stagDates || { start_date: '2026-03-06', end_date: '2026-03-08' }}
            onSuccess={() => {
              setEditingStagDates(false)
              fetchData()
            }}
            onCancel={() => setEditingStagDates(false)}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div>
              <span className="text-sm text-gray-600">Start Date: </span>
              <span className="font-semibold">
                {stagDates?.start_date 
                  ? formatDate(stagDates.start_date) 
                  : 'Not set'}
              </span>
            </div>
            {stagDates?.end_date && (
              <div>
                <span className="text-sm text-gray-600">End Date: </span>
                <span className="font-semibold">{formatDate(stagDates.end_date)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Deadline */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Payment Deadline</h2>
          <button
            onClick={() => {
              if (deadlines.length > 0) {
                setEditingDeadline(deadlines[0].id)
              } else {
                setShowAddDeadline(true)
              }
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
          >
            {deadlines.length > 0 ? 'Edit Deadline' : 'Set Deadline'}
          </button>
        </div>

        {showAddDeadline || editingDeadline ? (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">
              {deadlines.length > 0 ? 'Edit Payment Deadline' : 'Set Payment Deadline'}
            </h3>
            <SimpleDeadlineForm
              deadline={deadlines.length > 0 ? deadlines[0] : null}
              onSuccess={() => {
                setShowAddDeadline(false)
                setEditingDeadline(null)
                fetchData()
              }}
              onCancel={() => {
                setShowAddDeadline(false)
                setEditingDeadline(null)
              }}
            />
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {deadlines.length > 0 ? (
              <>
                <div>
                  <span className="text-sm text-gray-600">Label: </span>
                  <span className="font-semibold">{deadlines[0].label}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Due Date: </span>
                  <span className="font-semibold">{formatDate(deadlines[0].due_date)}</span>
                </div>
                {deadlines.length > 1 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Multiple deadlines found. Only the first one is used on the dashboard. 
                      Consider deleting the others to avoid confusion.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-600">No payment deadline set. Set one to enable reminder emails.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Event Name Form Component
function EventNameForm({ 
  initialName, 
  onSuccess, 
  onCancel 
}: { 
  initialName: string
  onSuccess: () => void
  onCancel: () => void 
}) {
  const [eventName, setEventName] = useState(initialName)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventName || eventName.trim() === '') {
      alert('Event name is required')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/event-name', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: eventName.trim(),
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        const errorMsg = data.details 
          ? `${data.error}\n\nDetails: ${data.details}`
          : data.error || 'Failed to update event name'
        alert(errorMsg)
      }
    } catch (err: any) {
      console.error('Error updating event name:', err)
      alert(`Failed to update event name: ${err.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Event Name</label>
        <input
          type="text"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="e.g., Owen's Stag 2026 - Bournemouth"
          className="w-full px-3 py-2 border rounded-md"
          required
        />
        <p className="text-xs text-gray-500 mt-1">This name will appear in the dashboard header and in email templates</p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Name'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Stag Dates Form Component
function StagDatesForm({ 
  initialDates, 
  onSuccess, 
  onCancel 
}: { 
  initialDates: { start_date: string; end_date?: string | null }
  onSuccess: () => void
  onCancel: () => void 
}) {
  // Format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined | null): string => {
    if (!dateString) return ''
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    // Otherwise, parse and format
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [startDate, setStartDate] = useState(formatDateForInput(initialDates.start_date))
  const [endDate, setEndDate] = useState(formatDateForInput(initialDates.end_date))
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate) {
      alert('Start date is required')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/stag-dates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate || null,
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        const errorMsg = data.hint 
          ? `${data.error}\n\n${data.hint}\n\nDetails: ${data.details || 'Unknown error'}`
          : `${data.error}\n\nDetails: ${data.details || 'Unknown error'}`
        alert(errorMsg)
      }
    } catch (err) {
      alert('Failed to update stag dates')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Start Date (Required)</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          required
        />
        <p className="text-xs text-gray-500 mt-1">This is the date the countdown is based on</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Leave empty if it's a single-day event</p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Dates'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Simple Deadline Form Component
function SimpleDeadlineForm({ 
  deadline, 
  onSuccess, 
  onCancel 
}: { 
  deadline: Deadline | null
  onSuccess: () => void
  onCancel: () => void
}) {
  // Format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return ''
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    // Otherwise, parse and format
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [label, setLabel] = useState(deadline?.label || '')
  const [dueDate, setDueDate] = useState(formatDateForInput(deadline?.due_date))
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!label || !dueDate) {
      alert('Label and due date are required')
      return
    }

    setSubmitting(true)
    try {
      if (deadline) {
        // Update existing deadline
        const res = await fetch(`/api/admin/deadlines/${deadline.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label,
            due_date: dueDate,
          }),
        })

        if (res.ok) {
          onSuccess()
        } else {
          const data = await res.json()
          const errorMsg = data.details 
            ? `${data.error}\n\nDetails: ${data.details}`
            : data.error || 'Failed to save deadline'
          alert(errorMsg)
        }
      } else {
        // Create new deadline
        const res = await fetch('/api/admin/deadlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label,
            due_date: dueDate,
          }),
        })

        if (res.ok) {
          onSuccess()
        } else {
          const data = await res.json()
          const errorMsg = data.details 
            ? `${data.error}\n\nDetails: ${data.details}`
            : data.error || 'Failed to save deadline'
          alert(errorMsg)
        }
      }
    } catch (err: any) {
      console.error('Error saving deadline:', err)
      alert(`Failed to save deadline: ${err.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Final Payment"
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          required
        />
        <p className="text-xs text-gray-500 mt-1">This is the date 100% payment is due for all guests</p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : deadline ? 'Update Deadline' : 'Set Deadline'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

