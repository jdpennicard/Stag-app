'use client'

import { useState, useEffect } from 'react'

type Score = { profileId: string; fullName: string; marks: number }

const RULES = `🪖 THE ARMY MAN GAME

This game runs all weekend.

At the start of the weekend, everyone must pick an Army Man from the bucket.

Your Army Man determines the pose you must freeze in.

You must copy your soldier's pose whenever the game is triggered.

👑 THE LOOKOUT

One person is the Lookout and wears the Lookout Crown.

Only the Lookout can trigger the game.

The Lookout role rotates throughout the weekend.

🚨 THE TRIGGER

If the Lookout shouts:

"GEORGIA'S COMING!"

Everyone must immediately freeze in their Army Man pose.

🍺 THE RULES

Last person to freeze drinks

If someone moves before release, they drink

If someone does the wrong pose, they drink

🟢 RELEASE

The Lookout must say:

"ALL CLEAR!"

Only then can everyone move again.

⚠️ COMMON SENSE

The Lookout cannot trigger the game when someone is:

Carrying drinks

Walking down stairs

Ordering at the bar

Driving

🎖 REMEMBER

You are now Army Men.

Stay alert.
Freeze fast.
And protect the Groom.`

export default function ArmyManGameContent() {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)

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

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">How to play</h2>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
          {RULES}
        </pre>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Marks (drinks)</h2>
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
    </>
  )
}
