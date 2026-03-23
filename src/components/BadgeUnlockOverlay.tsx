import { useNavigate } from 'react-router-dom'
import type { Milestone } from '../hooks/useWorkerProgress'

interface Props {
  milestone: Milestone
  completedJobs: number
  onClose: () => void
}

const CONFETTI_COLORS = ['#F47820', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

// Pre-calculated deterministic confetti — stable across renders
const CONFETTI = Array.from({ length: 20 }, (_, i) => {
  const angle = (i / 20) * Math.PI * 2
  const dist = 80 + (i % 4) * 22
  return {
    tx: Math.round(Math.cos(angle) * dist),
    ty: Math.round(Math.sin(angle) * dist),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + (i % 3) * 4,
    delay: `${(i * 0.04).toFixed(2)}s`,
    rotate: i % 2 === 0 ? 720 : -720,
  }
})

export function BadgeUnlockOverlay({ milestone, completedJobs, onClose }: Props) {
  const navigate = useNavigate()
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(6px)',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: '40px 24px 28px',
          width: '100%',
          maxWidth: 360,
          textAlign: 'center',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Confetti burst */}
        <div
          style={{
            position: 'absolute',
            top: '28%',
            left: '50%',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {CONFETTI.map((c, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: c.size,
                height: c.size,
                borderRadius: c.size > 8 ? 3 : '50%',
                background: c.color,
                ['--tx' as string]: `${c.tx}px`,
                ['--ty' as string]: `${c.ty}px`,
                animation: `confetti-pop 0.9s cubic-bezier(0.25,0.46,0.45,0.94) ${c.delay} both`,
              }}
            />
          ))}
        </div>

        {/* Badge icon — bounces in */}
        <div
          style={{
            fontSize: 72,
            lineHeight: 1,
            marginBottom: 14,
            display: 'inline-block',
            animation: 'badge-bounce 0.7s cubic-bezier(0.175,0.885,0.32,1.275) 0.15s both',
          }}
        >
          {milestone.icon}
        </div>

        <p
          style={{
            fontSize: 11,
            color: '#F47820',
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Badge Unlocked!
        </p>

        <h2
          style={{
            fontSize: 28,
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 900,
            color: '#0F172A',
            marginBottom: 4,
          }}
        >
          {milestone.badge}
        </h2>

        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
          Job {completedJobs} Complete
        </p>

        <div
          style={{
            display: 'inline-block',
            background: '#DCFCE7',
            color: '#16A34A',
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 999,
            padding: '8px 24px',
            marginBottom: 28,
          }}
        >
          {fmt(milestone.bonus)} bonus credited!
        </div>

        <button
          onClick={() => { onClose(); navigate('/worker/progress') }}
          style={{
            display: 'block',
            width: '100%',
            background: 'linear-gradient(135deg, #1A5FB8 0%, #F47820 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            borderRadius: 14,
            padding: '14px 0',
            border: 'none',
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          View Progress
        </button>

        <button
          onClick={onClose}
          style={{
            color: '#9CA3AF',
            fontSize: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
