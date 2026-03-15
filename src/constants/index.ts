export const SERVICES = [
  { id: 1, emoji: '🔧', name: 'Plumbing', desc: 'Leaks, pipes & taps' },
  { id: 2, emoji: '⚡', name: 'Electrician', desc: 'Wiring & switches' },
  { id: 3, emoji: '🪚', name: 'Carpentry', desc: 'Furniture & doors' },
  { id: 4, emoji: '❄️', name: 'AC Service', desc: 'Repair & gas refill' },
  { id: 5, emoji: '🧹', name: 'Deep Clean', desc: 'Home & sofa cleaning' },
  { id: 6, emoji: '🖌️', name: 'Painting', desc: 'Interior & exterior' },
  { id: 7, emoji: '🚿', name: 'Bathroom', desc: 'Tiles & fixtures' },
  { id: 8, emoji: '🔐', name: 'Locksmith', desc: 'Locks & keys' },
]

export const BOOKING_FEE = 125

export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  booked:          { label: 'Booking Placed',    color: '#8B5CF6', bg: '#8B5CF620' },
  worker_visiting: { label: 'Worker Visiting',   color: '#F59E0B', bg: '#F59E0B20' },
  inspecting:      { label: 'Inspecting',        color: '#8B5CF6', bg: '#8B5CF620' },
  quote_sent:      { label: 'Quote Ready',       color: '#3B82F6', bg: '#3B82F620' },
  in_progress:     { label: 'In Progress',       color: '#F97316', bg: '#F9731620' },
  done_uploaded:   { label: 'Verify Completion', color: '#10B981', bg: '#10B98120' },
  completed:       { label: 'Completed ✓',       color: '#10B981', bg: '#10B98120' },
  cancelled:       { label: 'Cancelled',         color: '#EF4444', bg: '#EF444420' },
}

export const JOURNEY_STEPS = [
  { status: 'booked',          icon: '💳', label: 'Booking Placed' },
  { status: 'worker_visiting', icon: '🚗', label: 'Worker Visiting' },
  { status: 'inspecting',      icon: '🔍', label: 'Inspection' },
  { status: 'quote_sent',      icon: '📋', label: 'Quote Received' },
  { status: 'in_progress',     icon: '🔧', label: 'Work In Progress' },
  { status: 'done_uploaded',   icon: '📸', label: 'Verify Completion' },
  { status: 'completed',       icon: '🎉', label: 'Job Complete' },
]

const STATUS_ORDER = ['booked', 'worker_visiting', 'inspecting', 'quote_sent', 'in_progress', 'done_uploaded', 'completed']

export function getStepIndex(status: string): number {
  return STATUS_ORDER.indexOf(status)
}

export const ADMIN_EMAIL = 'admin@getmypro.in'
