import { NavLink } from 'react-router-dom'
import { ShoppingCart, DollarSign, User } from 'lucide-react'

const TABS = [
  { to: '/dashboard', icon: ShoppingCart, label: 'Orders' },
  { to: '/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav({ pendingCount = 0 }: { pendingCount?: number }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-slate-900 border-t border-slate-800 z-50">
      <div className="flex items-center justify-around py-2">
        {TABS.map(tab => (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-6 py-1 relative ${isActive ? 'text-orange-500' : 'text-slate-500'}`
          }>
            {({ isActive }) => (
              <>
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {tab.to === '/dashboard' && pendingCount > 0 && (
                  <span className="absolute -top-0.5 right-3 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
