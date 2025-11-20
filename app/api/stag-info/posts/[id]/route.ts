import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    const isAdminEmail = adminEmails.includes(user.email || '')
    
    if (!isAdminEmail) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { headline, content, is_pinned, links } = await request.json()
    const postId = params.id

    if (!headline) {
      return NextResponse.json({ error: 'Headline is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Update the post
    const { error: postError } = await supabase
      .from('stag_info_posts')
      .update({
        headline,
        content: content || null,
        is_pinned: is_pinned || false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (postError) {
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
    }

    // Delete existing links
    await supabase.from('stag_info_links').delete().eq('post_id', postId)

    // Create new links if provided
    if (links && links.length > 0) {
      const linksToInsert: any[] = links.map((link: { title: string; url: string }) => ({
        post_id: postId,
        title: link.title,
        url: link.url,
      }))

      await supabase.from('stag_info_links').insert(linksToInsert)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    const isAdminEmail = adminEmails.includes(user.email || '')
    
    if (!isAdminEmail) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const postId = params.id
    const supabase = createServerClient()

    // Delete links first (cascade should handle this, but being explicit)
    await supabase.from('stag_info_links').delete().eq('post_id', postId)

    // Delete the post
    const { error } = await supabase.from('stag_info_posts').delete().eq('id', postId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

