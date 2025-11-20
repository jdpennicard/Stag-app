import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    const { data: posts, error } = await supabase
      .from('stag_info_posts')
      .select(`
        *,
        stag_info_links (*)
      `)
      .order('is_pinned', { ascending: false })
      .order('order_index', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    return NextResponse.json(posts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    if (!headline) {
      return NextResponse.json({ error: 'Headline is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Create the post
    const insertData: any = {
      headline,
      content: content || null,
      created_by: user.id,
      is_pinned: is_pinned || false,
      updated_at: new Date().toISOString(),
    }

    const { data: post, error: postError } = await supabase
      .from('stag_info_posts')
      .insert(insertData)
      .select()
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    // Create links if provided
    if (links && links.length > 0) {
      const linksToInsert: any[] = links.map((link: { title: string; url: string }) => ({
        post_id: post.id,
        title: link.title,
        url: link.url,
      }))

      await supabase.from('stag_info_links').insert(linksToInsert)
    }

    return NextResponse.json(post)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

