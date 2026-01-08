import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    // Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()

    // First, try to auto-link by email if there's a matching unclaimed profile
    if (user.email) {
      const { data: matchingProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_id')
        .eq('email', user.email as any)
        .is('user_id', null)
        .single()
      
      if (matchingProfile) {
        // Try to link it automatically
        const { error: linkError } = await supabase
          .from('profiles')
          .update({ user_id: user.id })
          .eq('id', matchingProfile.id as any)
          .is('user_id', null)
        
        // If linking succeeded, return empty array (user should be redirected)
        if (!linkError) {
          return NextResponse.json([])
        }
      }
    }

    // Fetch all unclaimed profiles (including those with emails)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .is('user_id', null)
      .eq('is_admin', false as any)
      .order('full_name')

    if (error) {
      console.error('Supabase error fetching unclaimed profiles:', error)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      return NextResponse.json(
        { 
          error: 'Failed to fetch profiles', 
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error in unclaimed profiles route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

