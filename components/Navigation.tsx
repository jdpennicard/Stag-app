'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

export default function Navigation({ isAdmin, isStagOnly, weekendMode }: { isAdmin?: boolean; isStagOnly?: boolean; weekendMode?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [adminStatus, setAdminStatus] = useState(isAdmin || false)
  const [stagOnly, setStagOnly] = useState(isStagOnly ?? false)
  const [weekend, setWeekend] = useState(weekendMode ?? false)

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, is_stag_only')
          .eq('user_id', user.id)
          .single()
        if (profile) {
          setAdminStatus((profile as { is_admin?: boolean }).is_admin || false)
          setStagOnly((profile as { is_stag_only?: boolean }).is_stag_only || false)
        }
      }
    }
    if (isAdmin === undefined || isStagOnly === undefined) {
      checkProfile()
    }
  }, [isAdmin, isStagOnly, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (stagOnly) {
    return (
      <div className="flex gap-4 items-center flex-wrap">
        <a href="/games" className={`text-sm ${pathname === '/games' ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}>Games</a>
        <button onClick={handleLogout} className="text-gray-600 hover:text-gray-800 text-sm">Logout</button>
      </div>
    )
  }

  if (weekend) {
    return (
      <div className="flex gap-4 items-center flex-wrap">
        {adminStatus && (
          <a href="/admin/event-info" className={`text-sm ${pathname?.startsWith('/admin') ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}>Admin Panel</a>
        )}
        <a href="/games" className={`text-sm ${pathname === '/games' ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}>Games</a>
        <button onClick={handleLogout} className="text-gray-600 hover:text-gray-800 text-sm">Logout</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {adminStatus && (
        <a href="/admin/event-info" className={`text-sm ${pathname?.startsWith('/admin') ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}>Admin Panel</a>
      )}
      <div className="flex gap-4 items-center flex-wrap">
        <a href="/dashboard" className={`text-sm ${pathname === '/dashboard' ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}>Payment - Home</a>
        <a href="/games" className={`text-sm ${pathname === '/games' ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}>Games</a>
        <a href="/stag-info" className={`text-sm ${pathname === '/stag-info' ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}>Stag Info Central</a>
        <button onClick={handleLogout} className="text-gray-600 hover:text-gray-800 text-sm">Logout</button>
      </div>
    </div>
  )
}

