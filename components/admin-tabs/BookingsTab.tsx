'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/supabase/database.types'
import BookingsContent from '@/components/BookingsContent'

export default function BookingsTab() {
  return <BookingsContent />
}

