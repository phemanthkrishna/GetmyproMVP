import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/**
 * iOS-style pill toggle — PDF motion rules: 200ms ease-out
 * Brand colors from logo: Blue #1D6FD9 (dark→active), Orange #E85520 accent
 * Touch target: 44×44px minimum (PDF iconography rules)
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        /* 48px wide to contain the pill, 44px tall for touch target */
        width: 48,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    >
      {/* Pill */}
      <div style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        background: isDark ? '#27272A' : '#1D6FD9',
        position: 'relative',
        transition: 'background 200ms ease-out',
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
      }}>
        {/* Moon — left */}
        <Moon
          size={12}
          style={{
            position: 'absolute',
            left: 6,
            color: isDark ? '#A1A1AA' : 'rgba(255,255,255,0.35)',
            transition: 'color 200ms ease-out',
          }}
        />
        {/* Sun — right */}
        <Sun
          size={12}
          style={{
            position: 'absolute',
            right: 6,
            color: isDark ? 'rgba(255,255,255,0.25)' : '#FFFFFF',
            transition: 'color 200ms ease-out',
          }}
        />
        {/* Sliding knob */}
        <div style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#FFFFFF',
          position: 'absolute',
          top: 3,
          left: isDark ? 3 : 25,
          transition: 'left 200ms ease-out',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }} />
      </div>
    </button>
  )
}
