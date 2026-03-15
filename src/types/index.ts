export type Role = 'customer' | 'worker' | 'admin'

export type OrderStatus =
  | 'booked'
  | 'worker_visiting'
  | 'inspecting'
  | 'quote_sent'
  | 'in_progress'
  | 'done_uploaded'
  | 'completed'
  | 'cancelled'

export interface Profile {
  id: string
  phone: string
  role: Role
  name: string
  session_token?: string
  created_at: string
}

export interface Worker {
  id: string
  name: string
  phone: string
  service: string
  aadhaar_url?: string
  photo_url?: string
  upi_id?: string
  verified: boolean
  service_categories: string[]
  is_online: boolean
  is_active: boolean
  created_at: string
}

export interface QuoteMaterial {
  name: string
  qty: number
  unit: string
}

export interface Order {
  id: string
  customer_id: string
  customer_name: string
  customer_phone: string
  service: string
  service_emoji: string
  address: string
  problem_description?: string
  status: OrderStatus
  booking_amt: number
  booking_paid: boolean
  worker_id?: string
  worker_name?: string
  worker_phone?: string
  arrival_otp: string
  quote_labour?: number
  quote_materials: QuoteMaterial[]
  mat_cost_admin?: number
  total_quote?: number
  final_paid: boolean
  job_photo_url?: string
  comp_otp: string
  rating?: number
  upi_booking_ref?: string
  upi_final_ref?: string
  mat_payment_done: boolean
  mat_discount_pct: number
  mat_commission: number
  worker_cancellation_pay?: number
  cancellation_pay_settled?: boolean
  labour_pay_settled?: boolean
  mat_store_id?: string
  mat_store_name?: string
  mat_store_contact?: string
  mat_collection_otp?: string
  mat_collected?: boolean
  created_at: string
  updated_at: string
}

export interface StoredSession {
  id: string
  name: string
  phone: string
  role: Role
}
