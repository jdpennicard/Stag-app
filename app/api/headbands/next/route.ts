import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { HEADBANDS_ITEMS, type HeadbandsCategoryId } from '@/lib/headbands-items'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const category = (request.nextUrl.searchParams.get('category') || 'random') as HeadbandsCategoryId
    const indices =
      category === 'random'
        ? HEADBANDS_ITEMS.map((_, i) => i)
        : HEADBANDS_ITEMS.map((item, i) => (item.category === category ? i : -1)).filter((i) => i >= 0)

    if (indices.length === 0) {
      return NextResponse.json({ error: 'No items in category' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: rows } = await supabase
      .from('headbands_usage')
      .select('item_index, last_used_at')
      .in('item_index', indices)

    const sorted = (rows || []).sort((a, b) => {
      const at = (a as { last_used_at: string | null }).last_used_at
      const bt = (b as { last_used_at: string | null }).last_used_at
      if (!at) return -1
      if (!bt) return 1
      return new Date(at).getTime() - new Date(bt).getTime()
    })
    const pool = sorted.slice(0, Math.min(50, sorted.length))
    const pick = pool[Math.floor(Math.random() * pool.length)]
    const itemIndex = pick ? (pick as { item_index: number }).item_index : indices[Math.floor(Math.random() * indices.length)]
    const item = HEADBANDS_ITEMS[itemIndex]
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 500 })
    }

    await supabase
      .from('headbands_usage')
      .update({ last_used_at: new Date().toISOString() })
      .eq('item_index', itemIndex)

    return NextResponse.json({
      text: item.text,
      category: item.category,
    })
  } catch (err) {
    console.error('headbands/next:', err)
    return NextResponse.json({ error: 'Failed to get item' }, { status: 500 })
  }
}
