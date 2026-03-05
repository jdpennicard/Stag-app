import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile, getViewAsProfileId } from '@/lib/auth'
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

  const profileData: any = profile as any
  if (profileData.is_stag_only) {
    redirect('/games')
  }
  const viewAsId = await getViewAsProfileId()
  const viewAsName = viewAsId ? profileData.full_name : undefined

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

  const postsArray: any[] = (posts || []) as any[]

  return (
    <StagInfoContent
      posts={postsArray}
      isAdmin={viewAsId ? false : profileData.is_admin}
      currentUserId={profileData.user_id || user.id}
      profileName={profileData.full_name}
      viewAsName={viewAsName}
    />
  )
}

