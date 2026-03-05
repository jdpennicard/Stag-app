'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/lib/supabase/database.types'
import Navigation from './Navigation'
import AdminPostManager from './AdminPostManager'
import WeekendsPlan from './WeekendsPlan'

type Post = Database['public']['Tables']['stag_info_posts']['Row'] & {
  stag_info_links: Database['public']['Tables']['stag_info_links']['Row'][]
}

interface StagInfoContentProps {
  posts: Post[]
  isAdmin: boolean
  currentUserId: string
  profileName?: string
  viewAsName?: string
}

export default function StagInfoContent({ posts: initialPosts, isAdmin, currentUserId, profileName, viewAsName }: StagInfoContentProps) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts)
  const [showAdminManager, setShowAdminManager] = useState(false)

  const handleStopViewingAs = async () => {
    try {
      await fetch('/api/admin/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: null }),
      })
      router.refresh()
    } catch (err) {
      console.error('Failed to stop viewing as:', err)
    }
  }

  // Separate posts into categories
  const pinnedPosts = posts.filter((p) => p.is_pinned)
  const regularPosts = posts.filter((p) => !p.is_pinned)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {viewAsName && (
          <div className="bg-amber-100 border border-amber-400 text-amber-900 rounded-lg p-4 mb-4 flex items-center justify-between">
            <span className="font-medium">Viewing as: {viewAsName}</span>
            <button
              onClick={handleStopViewingAs}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-sm font-medium"
            >
              Stop viewing as
            </button>
          </div>
        )}
        {/* Top Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "YOUR EVENT NAME"}
              </h1>
              <p className="text-gray-600">Welcome {profileName || 'Guest'}</p>
            </div>
            <Navigation isAdmin={isAdmin} isStagOnly={false} />
          </div>
        </div>

        {/* Admin Post Manager */}
        {showAdminManager && isAdmin && (
          <div className="mb-6">
            <AdminPostManager
              posts={posts}
              onUpdate={() => {
                window.location.reload()
              }}
            />
          </div>
        )}

        {/* Posts and Weekends Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Key Information - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 min-h-[400px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Key Information</h2>
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminManager(!showAdminManager)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                  >
                    {showAdminManager ? 'Hide Admin Panel' : 'Manage Posts'}
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {regularPosts.length === 0 && pinnedPosts.length === 0 ? (
                  <p className="text-gray-600">No posts yet. Check back soon!</p>
                ) : (
                  [...pinnedPosts, ...regularPosts].map((post) => (
                    <div
                      key={post.id}
                      className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500"
                    >
                      {post.is_pinned && (
                        <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded mb-2 inline-block">
                          📌 Pinned
                        </span>
                      )}
                      <h3 className="text-lg font-bold mb-2 text-gray-800">{post.headline}</h3>
                      {post.content && (
                        <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
                      )}

                      {/* Links */}
                      {post.stag_info_links && post.stag_info_links.length > 0 && (
                        <div className="mb-2">
                          {post.stag_info_links.map((link) => (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-blue-600 hover:text-blue-800 hover:underline text-sm mb-1"
                            >
                              🔗 {link.title}
                            </a>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(post.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Weekends Plan - Takes 1 column */}
          <div className="lg:col-span-1">
            <WeekendsPlan isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </div>
  )
}

