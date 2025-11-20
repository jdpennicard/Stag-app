'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

export default function Navigation({ isAdmin }: { isAdmin?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [adminStatus, setAdminStatus] = useState(isAdmin || false)

  useEffect(() => {
    // Check admin status
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .single()
        setAdminStatus(profile?.is_admin || false)
      }
    }
    if (isAdmin === undefined) {
      checkAdmin()
    }
  }, [isAdmin, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Admin-only links (top section) */}
      {adminStatus && (
        <div className="flex gap-4 items-center">
          <a 
            href="/admin" 
            className={`text-sm ${pathname === '/admin' ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}
          >
            Payments - Admin
          </a>
          <a 
            href="/admin/bookings" 
            className={`text-sm ${pathname === '/admin/bookings' ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}
          >
            Bookings - Admin
          </a>
        </div>
      )}
      
      {/* All users can see Payment - Home and Stag Info Central (bottom section) */}
      <div className="flex gap-4 items-center">
        <a 
          href="/dashboard" 
          className={`text-sm ${pathname === '/dashboard' ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}
        >
          Payment - Home
        </a>
        <a 
          href="/stag-info" 
          className={`text-sm ${pathname === '/stag-info' ? 'text-blue-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}
        >
          Stag Info Central
        </a>
        <button
          onClick={handleLogout}
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

