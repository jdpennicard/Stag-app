import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import StagInfoContent from '@/components/StagInfoContent'

export default async function StagInfoPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/claim-profile')
  }

  const supabase = createServerClient()

  // Fetch all posts with their links
  const { data: posts } = await supabase
    .from('stag_info_posts')
    .select(`
      *,
      stag_info_links (*)
    `)
    .order('is_pinned', { ascending: false })
    .order('order_index', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <StagInfoContent
      posts={posts || []}
      isAdmin={profile.is_admin}
      currentUserId={user.id}
      profileName={profile.full_name}
    />
  )
}

