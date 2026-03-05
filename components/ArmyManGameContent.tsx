'use client'

import { useState, useEffect } from 'react'

type Score = { profileId: string; fullName: string; marks: number }

const RULES = `🪖 THE ARMY MAN GAME — Runs all weekend. Pick an Army Man from the bucket; your soldier's pose is the one you must freeze in whenever the game is triggered.

👑 THE LOOKOUT — One person wears the Lookout Crown. Only they can trigger the game. Role rotates throughout the weekend.

🚨 TRIGGER — Lookout shouts "GEORGIA'S COMING!" → everyone freezes in their Army Man pose.

⚠️ MARKS — One mark if you: are last to freeze, move before release, or do the wrong pose.

🍺 FORFEIT — At 3 marks you do a drink forfeit, then your marks reset.

🟢 RELEASE — Lookout says "ALL CLEAR!" before anyone can move.

⚠️ COMMON SENSE — Don't trigger when someone is carrying drinks, on stairs, at the bar, or driving.

🎖 Stay alert. Freeze fast. Protect the Groom.`

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function ArmyManGameContent() {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [lookout, setLookout] = useState<string | null>(null)

  const fetchScores = async () => {
    try {
      const res = await fetch('/api/army-man/marks')
      if (res.ok) {
        const data = await res.json()
        setScores(data)
      }
    } catch (err) {
      console.error('Failed to load marks:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScores()
  }, [])

  const handleAddMark = async (profileId: string) => {
    setAddingId(profileId)
    try {
      const res = await fetch('/api/army-man/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      if (res.ok) {
        await fetchScores()
      }
    } catch (err) {
      console.error('Failed to add mark:', err)
    } finally {
      setAddingId(null)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset all marks to zero? This cannot be undone.')) return
    setResetting(true)
    try {
      const res = await fetch('/api/army-man/marks', { method: 'DELETE' })
      if (res.ok) {
        await fetchScores()
      }
    } catch (err) {
      console.error('Failed to reset marks:', err)
    } finally {
      setResetting(false)
    }
  }

  const handlePickLookout = () => {
    const chosen = pickRandom(scores)
    if (chosen) setLookout(chosen.fullName)
  }

  return (
    <>
      {/* Marks – top */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Marks</h2>
          <button
            onClick={handleReset}
            disabled={resetting || loading || scores.length === 0}
            className="text-sm text-gray-600 hover:text-red-700 border border-gray-300 hover:border-red-400 px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? 'Resetting…' : 'Reset all'}
          </button>
        </div>
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : scores.length === 0 ? (
          <p className="text-gray-500">No participants yet.</p>
        ) : (
          <ul className="space-y-3">
            {scores
              .slice()
              .sort((a, b) => b.marks - a.marks)
              .map(({ profileId, fullName, marks }) => (
                <li
                  key={profileId}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium">{fullName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-amber-600 tabular-nums">
                      {marks}
                    </span>
                    <button
                      onClick={() => handleAddMark(profileId)}
                      disabled={!!addingId}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded"
                    >
                      {addingId === profileId ? '…' : '+1'}
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Lookout – second */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">👑 The Lookout</h2>
        <p className="text-sm text-gray-600 mb-4">
          Randomly pick who wears the Lookout Crown and can trigger the game.
        </p>
        <button
          type="button"
          onClick={handlePickLookout}
          disabled={loading || scores.length === 0}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg"
        >
          Pick new Lookout
        </button>
        {lookout && (
          <p className="mt-4 text-lg font-semibold text-amber-700">
            {lookout} is the new Lookout! 👑
          </p>
        )}
      </div>

      {/* Rules – bottom, compact */}
      <details className="bg-white rounded-lg shadow-md p-6">
        <summary className="text-lg font-semibold cursor-pointer list-none">
          How to play
        </summary>
        <pre className="whitespace-pre-wrap text-xs text-gray-600 font-sans leading-snug mt-4 pt-4 border-t border-gray-100">
          {RULES}
        </pre>
      </details>
    </>
  )
}
