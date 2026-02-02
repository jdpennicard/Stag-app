import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, VIEW_AS_COOKIE } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const profileId = body.profileId ?? null

    if (!profileId) {
      const res = NextResponse.json({ ok: true })
      res.cookies.set(VIEW_AS_COOKIE, '', { maxAge: 0, path: '/' })
      return res
    }

    const supabase = createServerClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .single()

    if (error || !profile || !(profile as any).user_id) {
      return NextResponse.json(
        { error: 'Profile not found or not linked (cannot view as unclaimed)' },
        { status: 400 }
      )
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(VIEW_AS_COOKIE, profileId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24h
    })
    return res
  } catch (err) {
    console.error('view-as error:', err)
    return NextResponse.json({ error: 'Failed to set view-as' }, { status: 500 })
  }
}
