import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .not('user_id', 'is', null)
      .order('full_name')

    const { data: marks } = await supabase
      .from('army_man_marks')
      .select('profile_id')

    const countByProfile: Record<string, number> = {}
    for (const p of profiles || []) {
      countByProfile[p.id] = 0
    }
    for (const m of marks || []) {
      const pid = (m as { profile_id: string }).profile_id
      if (pid in countByProfile) countByProfile[pid]++
    }

    const scores = (profiles || []).map((p) => ({
      profileId: p.id,
      fullName: p.full_name,
      marks: countByProfile[p.id] ?? 0,
    }))

    return NextResponse.json(scores)
  } catch (err) {
    console.error('army-man marks GET:', err)
    return NextResponse.json({ error: 'Failed to load marks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const profileId = body.profileId
    if (!profileId || typeof profileId !== 'string') {
      return NextResponse.json({ error: 'profileId required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .not('user_id', 'is', null)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found or not linked' }, { status: 404 })
    }

    const { error } = await supabase.from('army_man_marks').insert({ profile_id: profileId })

    if (error) {
      console.error('army-man marks POST:', error)
      return NextResponse.json({ error: 'Failed to add mark' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('army-man marks POST:', err)
    return NextResponse.json({ error: 'Failed to add mark' }, { status: 500 })
  }
}
