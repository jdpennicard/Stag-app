'use client'

import { useState } from 'react'
import { Database } from '@/lib/supabase/database.types'

type Post = Database['public']['Tables']['stag_info_posts']['Row'] & {
  stag_info_links: Database['public']['Tables']['stag_info_links']['Row'][]
}

interface AdminPostManagerProps {
  posts: Post[]
  onUpdate: () => void
}

export default function AdminPostManager({ posts, onUpdate }: AdminPostManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const res = await fetch(`/api/stag-info/posts/${postId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        onUpdate()
      } else {
        alert('Failed to delete post')
      }
    } catch (err) {
      alert('Failed to delete post')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Manage Posts</h2>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingPost(null)
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          {showAddForm ? 'Cancel' : '+ New Post'}
        </button>
      </div>

      {showAddForm && (
        <PostForm
          post={editingPost}
          onSuccess={() => {
            setShowAddForm(false)
            setEditingPost(null)
            onUpdate()
          }}
          onCancel={() => {
            setShowAddForm(false)
            setEditingPost(null)
          }}
        />
      )}

      {editingPost && !showAddForm && (
        <PostForm
          post={editingPost}
          onSuccess={() => {
            setEditingPost(null)
            onUpdate()
          }}
          onCancel={() => setEditingPost(null)}
        />
      )}

      <div className="mt-6 space-y-4">
        <h3 className="font-semibold">Existing Posts:</h3>
        {posts.map((post) => (
          <div key={post.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{post.headline}</h4>
                  {post.is_pinned && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Pinned</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {post.stag_info_links?.length || 0} links
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => {
                    setEditingPost(post)
                    setShowAddForm(false)
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PostForm({ post, onSuccess, onCancel }: { post: Post | null; onSuccess: () => void; onCancel: () => void }) {
  const [headline, setHeadline] = useState(post?.headline || '')
  const [content, setContent] = useState(post?.content || '')
  const [isPinned, setIsPinned] = useState(post?.is_pinned || false)
  const [links, setLinks] = useState<Array<{ title: string; url: string }>>(
    post?.stag_info_links?.map((l) => ({ title: l.title, url: l.url })) || []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addLink = () => {
    setLinks([...links, { title: '', url: '' }])
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const updateLink = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...links]
    newLinks[index][field] = value
    setLinks(newLinks)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = post ? `/api/stag-info/posts/${post.id}` : '/api/stag-info/posts'
      const method = post ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          content,
          is_pinned: isPinned,
          links: links.filter((l) => l.title && l.url),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save post')
      }

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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Headline <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Post content..."
        />
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Pin this post to the top</span>
        </label>
      </div>

      {/* Links Section */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Links</label>
          <button
            type="button"
            onClick={addLink}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add Link
          </button>
        </div>
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder="Link title"
                value={link.title}
                onChange={(e) => updateLink(index, 'title', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                placeholder="URL"
                value={link.url}
                onChange={(e) => updateLink(index, 'url', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeLink(index)}
                className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : post ? 'Update Post' : 'Create Post'}
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

