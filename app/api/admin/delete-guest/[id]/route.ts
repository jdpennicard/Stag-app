import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

/**
 * Delete a guest profile
 * Admin-only endpoint
 * 
 * This will:
 * - Delete the profile (cascades to payments via profile_id)
 * - Optionally delete the associated auth user if one exists
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user's email is in ADMIN_EMAILS
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    const isAdminEmail = adminEmails.includes(user.email || '')
    
    if (!isAdminEmail) {
      // Also check via profile
      const admin = await isAdmin()
      if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    const supabase = createServerClient()

    // First, get the profile to check if it has a linked auth user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, email, full_name')
      .eq('id', params.id as any)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const profileData: any = profile as any

    // If profile has a linked auth user, delete it first
    if (profileData.user_id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        // Delete the auth user
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
          profileData.user_id
        )

        if (deleteAuthError) {
          console.error('Error deleting auth user:', deleteAuthError)
          // Continue anyway - the profile deletion might still work
          // The auth user might already be deleted or there might be a permission issue
        }
      }
    }

    // Delete the profile (this will cascade delete payments via profile_id)
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', params.id as any)

    if (deleteError) {
      console.error('Error deleting profile:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete guest', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `Guest "${profileData.full_name}" has been deleted successfully.`
    })
  } catch (error: any) {
    console.error('Error in delete-guest:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

