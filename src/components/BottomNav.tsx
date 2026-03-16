import { NavLink } from 'react-router-dom'
import { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
}

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-slate-900 border-t border-slate-700 flex z-50">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              isActive ? 'text-blue-500' : 'text-slate-500'
            }`
          }
        >
          <Icon size={20} />
          <span className="text-xs font-semibold">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
