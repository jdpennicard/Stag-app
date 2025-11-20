import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('weekends_plan_items')
      .select('*')
      .order('day_date', { ascending: true })
      .order('order_index', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch weekends plan items' }, { status: 500 })
    }

    return NextResponse.json(data || [])
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

    const { items } = await request.json()
    const supabase = createServerClient()

    // Validate items
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items must be an array' }, { status: 400 })
    }

    // Delete all existing items
    // First try to fetch all IDs, then delete them
    const { data: existingItems, error: fetchError } = await supabase
      .from('weekends_plan_items')
      .select('id')
    
    if (fetchError) {
      console.error('Error fetching existing items:', fetchError)
      console.error('Error code:', fetchError.code)
      console.error('Error message:', fetchError.message)
      console.error('Error details:', fetchError.details)
      console.error('Error hint:', fetchError.hint)
      
      // Return a helpful error message
      return NextResponse.json({ 
        error: 'Failed to fetch existing items', 
        details: fetchError.message,
        code: fetchError.code,
        hint: 'Please ensure the weekends_plan_items table exists and RLS policies are set up correctly. Run the add-stag-info-table.sql script in Supabase SQL Editor.'
      }, { status: 500 })
    }
    
    // Cast existingItems to any[] to avoid TypeScript errors
    const existingItemsArray: any[] = (existingItems || []) as any[]

    // Delete existing items if any exist
    if (existingItemsArray.length > 0) {
      const { error: deleteError } = await supabase
        .from('weekends_plan_items')
        .delete()
        .in('id', existingItemsArray.map((item: any) => item.id))
      
      if (deleteError) {
        console.error('Error deleting existing items:', deleteError)
        return NextResponse.json({ 
          error: 'Failed to clear existing items', 
          details: deleteError.message,
          code: deleteError.code
        }, { status: 500 })
      }
    }

    // Filter out empty items and prepare for insertion
    const validItems = items.filter((item: any) => item.item_text?.trim() && item.day_date && item.day_label)
    
    if (validItems.length === 0 && items.length > 0) {
      // All items were empty, but user tried to save - this is okay, just clear everything
      return NextResponse.json({ success: true, message: 'All items cleared' })
    }

    // Group items by day and calculate order_index within each day
    const itemsByDay: { [key: string]: any[] } = {}
    validItems.forEach((item: any) => {
      if (!itemsByDay[item.day_date]) {
        itemsByDay[item.day_date] = []
      }
      itemsByDay[item.day_date].push(item)
    })

    // Build insert array with proper order_index
    const itemsToInsert: any[] = []
    Object.keys(itemsByDay).forEach((dayDate) => {
      itemsByDay[dayDate].forEach((item: any, index: number) => {
        itemsToInsert.push({
          day_date: item.day_date,
          day_label: item.day_label,
          item_text: item.item_text.trim(),
          order_index: index,
          updated_at: new Date().toISOString(),
        })
      })
    })

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('weekends_plan_items')
        .insert(itemsToInsert)

      if (insertError) {
        console.error('Error inserting items:', insertError)
        return NextResponse.json({ 
          error: 'Failed to save weekends plan items', 
          details: insertError.message 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, count: itemsToInsert.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


