import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

/**
 * PATCH /api/admin/deadlines/[id]
 * Update a payment deadline (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    const isAdminEmail = adminEmails.includes(user.email || '')
    
    if (!isAdminEmail) {
      const admin = await isAdmin()
      if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { label, due_date } = body

    console.log('PATCH /api/admin/deadlines/[id] - Request body:', { label, due_date, id: params.id })

    const updateData: any = {}
    if (label !== undefined) updateData.label = label
    if (due_date !== undefined) updateData.due_date = due_date
    // Note: updated_at column may not exist in the table, so we'll only add it if the column exists
    // For now, let's not include it to avoid errors

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    console.log('PATCH /api/admin/deadlines/[id] - Update data:', updateData)

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('payment_deadlines')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('PATCH /api/admin/deadlines/[id] - Supabase error:', error)
      return NextResponse.json({ 
        error: 'Failed to update deadline', 
        details: error.message,
        code: error.code,
        hint: error.code === '42501' ? 'RLS policy violation - check if migration fix-payment-deadlines-rls.sql was run' : undefined
      }, { status: 500 })
    }

    console.log('PATCH /api/admin/deadlines/[id] - Success:', data)

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/deadlines/[id]
 * Delete a payment deadline (admin only)
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

    // Check admin access
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    const isAdminEmail = adminEmails.includes(user.email || '')
    
    if (!isAdminEmail) {
      const admin = await isAdmin()
      if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('payment_deadlines')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete deadline', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

