import { NavLink } from 'react-router-dom'
import { LucideIcon, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const { theme, toggleTheme } = useTheme()

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
      <button
        onClick={toggleTheme}
        className="w-12 flex flex-col items-center justify-center py-3 gap-1 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        <span className="text-xs font-semibold">{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    </nav>
  )
}
