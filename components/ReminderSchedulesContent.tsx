'use client'

import { useState, useEffect } from 'react'
import Navigation from './Navigation'

interface ReminderSchedule {
  id: string
  days_before: number
  template_id: string
  enabled: boolean
  description?: string
  created_at: string
  updated_at: string
  email_templates: {
    id: string
    name: string
    subject: string
    event_type: string
  }
}

interface EmailTemplate {
  id: string
  name: string
  event_type: string
}

export default function ReminderSchedulesContent() {
  const [schedules, setSchedules] = useState<ReminderSchedule[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ReminderSchedule | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [schedulesRes, templatesRes] = await Promise.all([
        fetch('/api/admin/reminder-schedules'),
        fetch('/api/admin/email-templates'),
      ])

      if (!schedulesRes.ok) {
        throw new Error('Failed to fetch reminder schedules')
      }

      if (!templatesRes.ok) {
        throw new Error('Failed to fetch email templates')
      }

      const schedulesData = await schedulesRes.json()
      const templatesData = await templatesRes.json()

      // Filter to only deadline_reminder templates
      const deadlineTemplates = templatesData.filter(
        (t: EmailTemplate) => t.event_type === 'deadline_reminder'
      )

      setSchedules(schedulesData)
      setTemplates(deadlineTemplates)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: {
    days_before: number
    template_id: string
    enabled: boolean
    description?: string
  }) => {
    try {
      const res = await fetch('/api/admin/reminder-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create schedule')
      }

      await fetchData()
      setShowCreateForm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule')
    }
  }

  const handleUpdate = async (id: string, data: {
    days_before?: number
    template_id?: string
    enabled?: boolean
    description?: string
  }) => {
    try {
      const res = await fetch(`/api/admin/reminder-schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update schedule')
      }

      await fetchData()
      setEditingSchedule(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder schedule?')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/reminder-schedules/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete schedule')
      }

      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete schedule')
    }
  }

  const handleToggleEnabled = async (schedule: ReminderSchedule) => {
    await handleUpdate(schedule.id, { enabled: !schedule.enabled })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation isAdmin={true} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation isAdmin={true} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Deadline Reminder Schedules</h1>
              <p className="text-gray-600 mt-2">
                Configure when reminder emails are sent before payment deadlines
              </p>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(true)
                setEditingSchedule(null)
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              + Create Schedule
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {showCreateForm && (
            <ScheduleForm
              templates={templates}
              onSave={handleCreate}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {editingSchedule && (
            <ScheduleForm
              schedule={editingSchedule}
              templates={templates}
              onSave={(data) => handleUpdate(editingSchedule.id, data)}
              onCancel={() => setEditingSchedule(null)}
            />
          )}

          <div className="mt-6 space-y-4">
            {schedules.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No reminder schedules yet. Create your first schedule above.
              </p>
            ) : (
              schedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  onEdit={() => {
                    setEditingSchedule(schedule)
                    setShowCreateForm(false)
                  }}
                  onDelete={() => handleDelete(schedule.id)}
                  onToggleEnabled={() => handleToggleEnabled(schedule)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  schedule: ReminderSchedule
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled: () => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {schedule.days_before} {schedule.days_before === 1 ? 'Day' : 'Days'} Before Deadline
            </h3>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                schedule.enabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {schedule.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {schedule.description && (
            <p className="text-gray-600 mt-1">{schedule.description}</p>
          )}
          <div className="mt-2 text-sm text-gray-500">
            <span className="font-medium">Template:</span> {schedule.email_templates.name}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            <span className="font-medium">Subject:</span> {schedule.email_templates.subject}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleEnabled}
            className={`px-3 py-1 rounded text-sm ${
              schedule.enabled
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            {schedule.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function ScheduleForm({
  schedule,
  templates,
  onSave,
  onCancel,
}: {
  schedule?: ReminderSchedule
  templates: EmailTemplate[]
  onSave: (data: {
    days_before: number
    template_id: string
    enabled: boolean
    description?: string
  }) => void
  onCancel: () => void
}) {
  const [daysBefore, setDaysBefore] = useState(schedule?.days_before || 7)
  const [templateId, setTemplateId] = useState(schedule?.template_id || '')
  const [enabled, setEnabled] = useState(schedule?.enabled !== undefined ? schedule.enabled : true)
  const [description, setDescription] = useState(schedule?.description || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      days_before: daysBefore,
      template_id: templateId,
      enabled,
      description: description || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-6 mb-4 bg-gray-50">
      <h2 className="text-xl font-bold mb-4">
        {schedule ? 'Edit Reminder Schedule' : 'Create Reminder Schedule'}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Days Before Deadline <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={daysBefore}
            onChange={(e) => setDaysBefore(parseInt(e.target.value) || 0)}
            min="0"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="7"
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of days before the deadline to send this reminder (e.g., 7 for 7 days before)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Template <span className="text-red-500">*</span>
          </label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {templates.length === 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              No deadline reminder templates found. Create one in Email Templates first.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., First reminder, Final reminder"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
            Enabled (schedules must be enabled to send reminders)
          </label>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {schedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

