'use client'

import { useState, useEffect } from 'react'
import Navigation from './Navigation'
import { getAvailableVariablesList } from '@/lib/email/variables'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_text: string
  body_html?: string
  description?: string
  event_type: string
  enabled: boolean
  reminder_days?: number[] // Array of days before deadline (only for deadline_reminder)
  created_at: string
  updated_at: string
}

const EVENT_TYPES = [
  { value: 'signup', label: 'Sign Up Confirmation' },
  { value: 'signup_link', label: 'Signup Link' },
  { value: 'payment_submitted', label: 'Payment Submitted' },
  { value: 'payment_approved', label: 'Payment Approved' },
  { value: 'payment_rejected', label: 'Payment Rejected' },
  { value: 'deadline_reminder', label: 'Deadline Reminder' },
]

export default function EmailTemplatesContent() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showVariables, setShowVariables] = useState(false)

  const availableVariables = getAvailableVariablesList()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/email-templates')
      if (!res.ok) {
        throw new Error('Failed to fetch templates')
      }
      const data = await res.json()
      setTemplates(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (templateData: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create template')
      }

      setShowCreateForm(false)
      fetchTemplates()
    } catch (err: any) {
      setError(err.message || 'Failed to create template')
    }
  }

  const handleUpdate = async (id: string, templateData: Partial<EmailTemplate>) => {
    try {
      const res = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update template')
      }

      setEditingTemplate(null)
      fetchTemplates()
    } catch (err: any) {
      setError(err.message || 'Failed to update template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete template')
      }

      fetchTemplates()
    } catch (err: any) {
      setError(err.message || 'Failed to delete template')
    }
  }

  const handleToggleEnabled = async (template: EmailTemplate) => {
    await handleUpdate(template.id, { enabled: !template.enabled })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Email Templates</h1>
              <p className="text-gray-600">Manage email templates for automated notifications</p>
            </div>
            <Navigation isAdmin={true} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Available Variables Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Available Variables</h2>
            <button
              onClick={() => setShowVariables(!showVariables)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {showVariables ? 'Hide' : 'Show'} Variables
            </button>
          </div>
          {showVariables && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Use these variables in your templates. They will be replaced with actual values when emails are sent.
                You can use either <code className="bg-gray-100 px-1 rounded">{'{variable}'}</code> or{' '}
                <code className="bg-gray-100 px-1 rounded">[variable]</code> syntax.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableVariables.map((variable) => (
                  <div key={variable.name} className="flex items-start">
                    <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono mr-2">
                      {variable.name}
                    </code>
                    <span className="text-sm text-gray-600">{variable.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Templates List */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Templates</h2>
            <button
              onClick={() => {
                setShowCreateForm(true)
                setEditingTemplate(null)
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              + Create Template
            </button>
          </div>

          {showCreateForm && (
            <TemplateForm
              onSave={handleCreate}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {editingTemplate && (
            <TemplateForm
              template={editingTemplate}
              onSave={(data) => handleUpdate(editingTemplate.id, data)}
              onCancel={() => setEditingTemplate(null)}
            />
          )}

          <div className="mt-6 space-y-4">
            {templates.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No templates yet. Create your first template above.</p>
            ) : (
              templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => {
                    setEditingTemplate(template)
                    setShowCreateForm(false)
                  }}
                  onDelete={() => handleDelete(template.id)}
                  onToggleEnabled={() => handleToggleEnabled(template)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  template: EmailTemplate
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled: () => void
}) {
  const eventTypeLabel = EVENT_TYPES.find((e) => e.value === template.event_type)?.label || template.event_type
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestResult({ success: false, message: 'Please enter a valid email address' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      })

      // Check if response is JSON
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an error page. Check console for details.')
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to send test email')
      }

      setTestResult({ success: true, message: data.message || 'Test email sent successfully!' })
      setTimeout(() => {
        setShowTestDialog(false)
        setTestEmail('')
        setTestResult(null)
      }, 2000)
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Failed to send test email' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">{template.name}</h3>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  template.enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {template.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                {eventTypeLabel}
              </span>
            </div>
            {template.description && (
              <p className="text-sm text-gray-600 mb-2">{template.description}</p>
            )}
            <div className="text-sm text-gray-500 mb-2">
              <strong>Subject:</strong> {template.subject}
            </div>
            <div className="text-sm text-gray-500">
              <strong>Body Preview:</strong>{' '}
              {template.body_text.substring(0, 150)}
              {template.body_text.length > 150 ? '...' : ''}
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setShowTestDialog(true)}
              className="px-3 py-1 rounded text-sm bg-purple-100 text-purple-800 hover:bg-purple-200"
              title="Send test email"
            >
              Test
            </button>
            <button
              onClick={onToggleEnabled}
              className={`px-3 py-1 rounded text-sm ${
                template.enabled
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {template.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={onEdit}
              className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1 rounded text-sm bg-red-100 text-red-800 hover:bg-red-200"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Test Email Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter an email address to send a test email with sample data. This will help you verify that your template and variables work correctly.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={testing}
              />
            </div>
            {testResult && (
              <div
                className={`mb-4 px-4 py-3 rounded ${
                  testResult.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {testResult.message}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleTestEmail}
                disabled={testing || !testEmail}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
              <button
                onClick={() => {
                  setShowTestDialog(false)
                  setTestEmail('')
                  setTestResult(null)
                }}
                disabled={testing}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TemplateForm({
  template,
  onSave,
  onCancel,
}: {
  template?: EmailTemplate
  onSave: (data: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(template?.name || '')
  const [subject, setSubject] = useState(template?.subject || '')
  const [bodyText, setBodyText] = useState(template?.body_text || '')
  const [bodyHtml, setBodyHtml] = useState(template?.body_html || '')
  const [description, setDescription] = useState(template?.description || '')
  const [eventType, setEventType] = useState(template?.event_type || 'signup')
  const [enabled, setEnabled] = useState(template?.enabled !== undefined ? template.enabled : true)
  const [reminderDays, setReminderDays] = useState<string>(
    template?.reminder_days?.join(', ') || ''
  )
  const [showPreview, setShowPreview] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Parse reminder days (comma-separated integers)
    let parsedReminderDays: number[] | undefined = undefined
    if (eventType === 'deadline_reminder' && reminderDays.trim()) {
      parsedReminderDays = reminderDays
        .split(',')
        .map(d => parseInt(d.trim()))
        .filter(d => !isNaN(d) && d >= 0)
    }
    
    onSave({
      name,
      subject,
      body_text: bodyText,
      body_html: bodyHtml || undefined,
      description: description || undefined,
      event_type: eventType,
      enabled,
      reminder_days: parsedReminderDays,
    })
  }

  // Sample preview data
  const previewData = {
    name: 'John Doe',
    email: 'john@example.com',
    total_due: '£500.00',
    confirmed_paid: '£200.00',
    remaining: '£300.00',
    percent_paid: '40',
    payment_amount: '£100.00',
    payment_date: '15th January 2026',
    deadline_date: '1st February 2026',
    days_away: '7',
    event_name: "Owen's Stag 2026 - Bournemouth",
    bank_account_number: '12345678',
    bank_sort_code: '12-34-56',
  }

  const previewSubject = subject.replace(/\{(\w+)\}|\[(\w+)\]/g, (match, var1, var2) => {
    const varName = var1 || var2
    return previewData[varName as keyof typeof previewData] || match
  })

  const previewBody = bodyText.replace(/\{(\w+)\}|\[(\w+)\]/g, (match, var1, var2) => {
    const varName = var1 || var2
    return previewData[varName as keyof typeof previewData] || match
  })

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-6 mb-4 bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">
        {template ? 'Edit Template' : 'Create New Template'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g., signup_welcome"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Unique identifier for this template</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Type <span className="text-red-500">*</span>
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {eventType === 'deadline_reminder' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reminder Days <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              required={eventType === 'deadline_reminder'}
              placeholder="7, 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated list of days before deadline to send reminders (e.g., "7, 2" for 7 days and 2 days before)
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When this email is sent..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="e.g., Welcome {name}!"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">You can use variables like {`{name}`} or [name]</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Body (Text) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            required
            rows={8}
            placeholder="Hello {name},&#10;&#10;The deadline is {days_away} days away, you still owe {remaining}..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Plain text email body. Use variables like {`{name}`}, {`{days_away}`}, {`{remaining}`}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Body (HTML) <span className="text-gray-500">(Optional)</span>
          </label>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={8}
            placeholder="<p>Hello {name},</p>&#10;<p>The deadline is {days_away} days away...</p>"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">HTML version (optional). If not provided, text version will be used.</p>
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
            Enabled (templates must be enabled to be used)
          </label>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {template ? 'Update Template' : 'Create Template'}
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>

        {showPreview && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-2">Preview (with sample data):</h4>
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="mb-2">
                <strong>Subject:</strong> {previewSubject || '(empty)'}
              </div>
              <div className="whitespace-pre-wrap text-sm">{previewBody || '(empty)'}</div>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}

