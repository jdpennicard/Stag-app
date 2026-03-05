'use client'

import { useState } from 'react'
import { HEADBANDS_CATEGORIES, type HeadbandsCategoryId } from '@/lib/headbands-items'

export default function HeadbandsGame() {
  const [category, setCategory] = useState<HeadbandsCategoryId>('random')
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'show'>('idle')
  const [count, setCount] = useState(10)
  const [item, setItem] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePlay = () => {
    setPhase('countdown')
    setItem(null)
    setCount(10)
    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval)
          setLoading(true)
          fetchItem()
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const fetchItem = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/headbands/next?category=${encodeURIComponent(category)}`)
      if (!res.ok) throw new Error('Failed to get item')
      const data = await res.json()
      setItem(data.text)
      setPhase('show')
    } catch (err) {
      console.error(err)
      setPhase('idle')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    setPhase('idle')
    setItem(null)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Pick a category</h2>
        <div className="flex flex-wrap gap-2">
          {HEADBANDS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {phase === 'idle' && (
          <>
            <p className="text-gray-600 mb-4">
              Put your phone on your head after the countdown. Ask questions to guess what you are!
            </p>
            <button
              type="button"
              onClick={handlePlay}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 px-6 rounded-xl text-lg"
            >
              Let&apos;s play
            </button>
          </>
        )}

        {phase === 'countdown' && (
          <div className="text-center py-12">
            {loading ? (
              <p className="text-2xl text-gray-500">...</p>
            ) : (
              <p className="text-8xl font-black text-violet-600 tabular-nums">
                {count || '…'}
              </p>
            )}
          </div>
        )}

        {phase === 'show' && item && (
          <div className="text-center py-8">
            <p className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 break-words">
              {item}
            </p>
            <button
              type="button"
              onClick={handleNext}
              className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-6 rounded-lg"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  )
}
