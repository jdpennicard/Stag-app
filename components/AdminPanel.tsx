'use client'

import { usePathname, useRouter } from 'next/navigation'
import Navigation from './Navigation'
import EventInfoTab from './admin-tabs/EventInfoTab'
import AttendeesTab from './admin-tabs/AttendeesTab'
import PaymentsTab from './admin-tabs/PaymentsTab'
import BookingsTab from './admin-tabs/BookingsTab'
import EmailTemplatesTab from './admin-tabs/EmailTemplatesTab'

const TABS = [
  { id: 'event-info', label: 'Event Info', path: '/admin/event-info' },
  { id: 'attendees', label: 'Attendees', path: '/admin/attendees' },
  { id: 'payments', label: 'Payments', path: '/admin/payments' },
  { id: 'bookings', label: 'Bookings', path: '/admin/bookings' },
  { id: 'email-templates', label: 'Email Templates', path: '/admin/email-templates' },
]

export default function AdminPanel() {
  const pathname = usePathname()
  const router = useRouter()

  // Determine current tab from pathname
  const currentTab = TABS.find(tab => pathname === tab.path) || TABS[0]

  const handleTabChange = (tabPath: string) => {
    router.push(tabPath)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <Navigation isAdmin={true} />
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.path)}
                  className={`
                    px-6 py-4 text-sm font-medium border-b-2 transition-colors
                    ${
                      pathname === tab.path
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {pathname === '/admin/event-info' && <EventInfoTab />}
          {pathname === '/admin/attendees' && <AttendeesTab />}
          {pathname === '/admin/payments' && <PaymentsTab />}
          {pathname === '/admin/bookings' && <BookingsTab />}
          {pathname === '/admin/email-templates' && <EmailTemplatesTab />}
        </div>
      </div>
    </div>
  )
}

