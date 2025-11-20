'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/supabase/database.types'

type PlanItem = Database['public']['Tables']['weekends_plan_items']['Row']

interface WeekendsPlanProps {
  isAdmin: boolean
}

// Define the stag dates
const STAG_DATES = [
  { date: '2026-03-06', label: 'Friday 6th March' },
  { date: '2026-03-07', label: 'Saturday 7th' },
  { date: '2026-03-08', label: 'Sunday 8th' },
  { date: '2026-03-09', label: 'Monday 9th' },
]

export default function WeekendsPlan({ isAdmin }: WeekendsPlanProps) {
  const [items, setItems] = useState<PlanItem[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchWeekendsPlan()
  }, [])

  const fetchWeekendsPlan = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stag-info/weekends-plan/items')
      if (res.ok) {
        const data = await res.json()
        setItems(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch weekends plan:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Filter out empty items and temp items, then prepare for save
      const itemsToSave = items
        .filter((item) => item.item_text?.trim())
        .map((item, index) => ({
          ...item,
          item_text: item.item_text.trim(),
        }))

      const res = await fetch('/api/stag-info/weekends-plan/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save weekends plan')
      }

      setIsEditing(false)
      await fetchWeekendsPlan() // Refresh to get updated content from DB
    } catch (err: any) {
      alert(`Failed to save weekends plan: ${err.message || 'Unknown error'}`)
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const addItem = (dayDate: string, dayLabel: string) => {
    const newItem: Omit<PlanItem, 'id' | 'created_at' | 'updated_at'> = {
      day_date: dayDate,
      day_label: dayLabel,
      item_text: '',
      order_index: items.filter((i) => i.day_date === dayDate).length,
    }
    setItems([...items, { ...newItem, id: `temp-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: 'item_text' | 'day_date' | 'day_label', value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  // Group items by date
  const itemsByDate = STAG_DATES.map((stagDate) => ({
    ...stagDate,
    items: items
      .filter((item) => item.day_date === stagDate.date)
      .sort((a, b) => a.order_index - b.order_index),
  }))

  return (
    <div className="bg-white rounded-lg shadow-md p-6 min-h-[400px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Weekends Plan</h2>
        {isAdmin && (
          <button
            onClick={() => {
              if (isEditing) {
                handleSave()
              } else {
                setIsEditing(true)
              }
            }}
            disabled={saving || loading}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isEditing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : isEditing && isAdmin ? (
        <div className="space-y-4">
          {STAG_DATES.map((stagDate) => {
            const dayItems = items.filter((item) => item.day_date === stagDate.date)
            return (
              <div key={stagDate.date} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-800">{stagDate.label}</h3>
                  <button
                    type="button"
                    onClick={() => addItem(stagDate.date, stagDate.label)}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div key={item.id} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={item.item_text}
                        onChange={(e) => updateItem(item.id, 'item_text', e.target.value)}
                        placeholder="Enter itinerary item..."
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {dayItems.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No items for this day</p>
                  )}
                </div>
              </div>
            )
          })}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {saving ? 'Saving...' : 'Save All'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                fetchWeekendsPlan() // Reset to original content
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {itemsByDate.map(({ date, label, items: dayItems }) => (
            <div key={date}>
              <h3 className="font-semibold text-gray-800 mb-2">{label}</h3>
              {dayItems.length > 0 ? (
                <ul className="space-y-1 ml-4">
                  {dayItems.map((item) => (
                    <li key={item.id} className="flex items-start">
                      <span className="mr-2 text-blue-600">•</span>
                      <span className="text-gray-700 text-sm">{item.item_text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm italic ml-4">No items scheduled</p>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-gray-500 text-sm">
              {isAdmin 
                ? 'No weekend plan yet. Click "Edit" to add an itinerary.'
                : 'Weekend plan coming soon!'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

