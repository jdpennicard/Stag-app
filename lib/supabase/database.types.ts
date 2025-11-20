export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string | null
          full_name: string
          email: string | null
          is_admin: boolean
          total_due: number
          initial_confirmed_paid: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name: string
          email?: string | null
          is_admin?: boolean
          total_due: number
          initial_confirmed_paid?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          full_name?: string
          email?: string | null
          is_admin?: boolean
          total_due?: number
          initial_confirmed_paid?: number
          created_at?: string
        }
      }
      payment_deadlines: {
        Row: {
          id: string
          label: string
          due_date: string
          suggested_amount: number | null
          created_at: string
        }
        Insert: {
          id?: string
          label: string
          due_date: string
          suggested_amount?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          label?: string
          due_date?: string
          suggested_amount?: number | null
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string | null
          profile_id: string | null
          deadline_id: string | null
          amount: number
          status: PaymentStatus
          note: string | null
          created_at: string
          confirmed_at: string | null
          confirmed_by: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          profile_id?: string | null
          deadline_id?: string | null
          amount: number
          status?: PaymentStatus
          note?: string | null
          created_at?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          profile_id?: string | null
          deadline_id?: string | null
          amount?: number
          status?: PaymentStatus
          note?: string | null
          created_at?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
        }
      }
      bookings: {
        Row: {
          id: string
          description: string
          location: string | null
          booked_by: string | null
          cost: number
          paid_so_far: number
          first_payment_date: string | null
          next_payment_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          description: string
          location?: string | null
          booked_by?: string | null
          cost: number
          paid_so_far?: number
          first_payment_date?: string | null
          next_payment_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          description?: string
          location?: string | null
          booked_by?: string | null
          cost?: number
          paid_so_far?: number
          first_payment_date?: string | null
          next_payment_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stag_info_posts: {
        Row: {
          id: string
          headline: string
          content: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          is_pinned: boolean
          order_index: number
        }
        Insert: {
          id?: string
          headline: string
          content?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          is_pinned?: boolean
          order_index?: number
        }
        Update: {
          id?: string
          headline?: string
          content?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          is_pinned?: boolean
          order_index?: number
        }
      }
      stag_info_links: {
        Row: {
          id: string
          post_id: string
          title: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          title: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          title?: string
          url?: string
          created_at?: string
        }
      }
      stag_info_documents: {
        Row: {
          id: string
          post_id: string
          title: string
          file_url: string
          file_name: string
          file_size: number | null
          file_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          title: string
          file_url: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          title?: string
          file_url?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          created_at?: string
        }
      }
      weekends_plan: {
        Row: {
          id: string
          content: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          content?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          content?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      weekends_plan_items: {
        Row: {
          id: string
          day_date: string
          day_label: string
          item_text: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day_date: string
          day_label: string
          item_text: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day_date?: string
          day_label?: string
          item_text?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

