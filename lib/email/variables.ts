/**
 * Email Template Variable System
 * 
 * Defines available variables that can be used in email templates
 * and provides functions to extract values from context
 */

export interface EmailContext {
  profile?: {
    id: string
    full_name: string
    email: string
    total_due: number
    initial_confirmed_paid: number
    confirmed_total?: number
    remaining?: number
  }
  payment?: {
    id: string
    amount: number
    status: string
    note?: string
    created_at: string
    deadline_label?: string
  }
  deadline?: {
    id: string
    label: string
    due_date: string
    suggested_amount?: number
    days_away?: number
  }
  event_name?: string
  bank_account_name?: string
  bank_account_number?: string
  bank_sort_code?: string
  dashboard_url?: string
  signup_link?: string
}

/**
 * Available variables that can be used in templates
 * Format: {variable_name} or [variable_name]
 */
export const AVAILABLE_VARIABLES = {
  // Profile variables
  name: 'Guest full name',
  email: 'Guest email address',
  total_due: 'Total amount due',
  confirmed_paid: 'Total confirmed paid amount',
  remaining: 'Amount remaining to pay',
  percent_paid: 'Percentage paid (0-100)',
  
  // Payment variables
  payment_amount: 'Payment amount',
  payment_note: 'Payment note/description',
  payment_date: 'Payment submission date',
  payment_status: 'Payment status (pending/confirmed/rejected)',
  deadline_label: 'Payment deadline label',
  
  // Deadline variables
  deadline_date: 'Deadline due date',
  deadline_label_deadline: 'Deadline label',
  days_away: 'Days until deadline',
  suggested_amount: 'Suggested payment amount for deadline',
  
  // Event/App variables
  event_name: 'Event name (e.g., "Owen\'s Stag 2026 - Bournemouth")',
  bank_account_name: 'Bank account name',
  bank_account_number: 'Bank account number',
  bank_sort_code: 'Bank sort code',
  dashboard_url: 'Link to dashboard',
  signup_link: 'Magic signup link for guest to create account',
} as const

export type VariableName = keyof typeof AVAILABLE_VARIABLES

/**
 * Get all available variable names formatted for display
 */
export function getAvailableVariablesList(): Array<{ name: string; description: string }> {
  return Object.entries(AVAILABLE_VARIABLES).map(([name, description]) => ({
    name: `{${name}}`,
    description,
  }))
}

/**
 * Extract variable values from context
 */
export function getVariableValue(variableName: string, context: EmailContext): string {
  const normalizedName = variableName.toLowerCase().replace(/[{}[\]]/g, '')
  
  switch (normalizedName) {
    // Profile variables
    case 'name':
      return context.profile?.full_name || 'Guest'
    case 'email':
      return context.profile?.email || ''
    case 'total_due':
      return formatCurrency(context.profile?.total_due || 0)
    case 'confirmed_paid':
      return formatCurrency(context.profile?.confirmed_total || context.profile?.initial_confirmed_paid || 0)
    case 'remaining':
      return formatCurrency(context.profile?.remaining || 0)
    case 'percent_paid': {
      const total = context.profile?.total_due || 0
      const paid = context.profile?.confirmed_total || context.profile?.initial_confirmed_paid || 0
      if (total === 0) return '100'
      return Math.round((paid / total) * 100).toString()
    }
    
    // Payment variables
    case 'payment_amount':
      return formatCurrency(context.payment?.amount || 0)
    case 'payment_note':
      return context.payment?.note || ''
    case 'payment_date':
      return context.payment?.created_at 
        ? formatDate(context.payment.created_at)
        : ''
    case 'payment_status':
      return context.payment?.status || ''
    case 'deadline_label':
      return context.payment?.deadline_label || context.deadline?.label || ''
    
    // Deadline variables
    case 'deadline_date':
      return context.deadline?.due_date 
        ? formatDate(context.deadline.due_date)
        : ''
    case 'deadline_label_deadline':
      return context.deadline?.label || ''
    case 'days_away':
      return context.deadline?.days_away?.toString() || '0'
    case 'suggested_amount':
      return formatCurrency(context.deadline?.suggested_amount || 0)
    
    // Event/App variables
    case 'event_name':
      return context.event_name || process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "Owen's Stag 2026 - Bournemouth"
    case 'bank_account_name':
      return context.bank_account_name || process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME || ''
    case 'bank_account_number':
      return context.bank_account_number || process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER || ''
    case 'bank_sort_code':
      return context.bank_sort_code || process.env.NEXT_PUBLIC_STAG_BANK_SORT_CODE || ''
    case 'dashboard_url':
      return context.dashboard_url || (typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '/dashboard')
    case 'signup_link':
      return context.signup_link || ''
    
    default:
      return `[${variableName}]` // Return as-is if variable not found
  }
}

/**
 * Replace variables in text with actual values
 * Supports both {variable} and [variable] syntax
 */
export function substituteVariables(text: string, context: EmailContext): string {
  if (!text) return ''
  
  // Match both {variable} and [variable] patterns
  const variablePattern = /\{([^}]+)\}|\[([^\]]+)\]/g
  
  return text.replace(variablePattern, (match, curlyVar, bracketVar) => {
    const varName = curlyVar || bracketVar
    return getVariableValue(varName, context)
  })
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  const currency = process.env.NEXT_PUBLIC_STAG_CURRENCY || 'GBP'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

