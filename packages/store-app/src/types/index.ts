export interface StoreSession {
  id: string          // UUID from stores table
  store_id: string    // STR-XXXXXX display ID
  name: string
  store_type: string
  contact: string
  commission_pct: number
}

export interface QuoteMaterial {
  name: string
  qty: number
  unit: string
  price?: number
}

export type OrderStatus =
  | 'booked' | 'inspecting' | 'quote_sent'
  | 'in_progress' | 'material_collected'
  | 'done_uploaded' | 'completed' | 'cancelled'

export interface StoreOrder {
  id: string
  customer_name: string
  customer_phone: string
  service: string
  service_emoji: string
  address: string
  status: OrderStatus
  mat_store_id: string
  worker_name?: string
  worker_phone?: string
  quote_materials: QuoteMaterial[]
  mat_cost_admin?: number
  mat_cost_store?: number
  store_earnings?: number
  mat_collection_otp?: string
  mat_collected: boolean
  quote_labour?: number
  total_quote?: number
  created_at: string
}
