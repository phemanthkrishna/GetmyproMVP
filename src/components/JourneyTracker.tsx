import { JOURNEY_STEPS, getStepIndex } from '../constants'

export function JourneyTracker({ status, workerId }: { status: string; workerId?: string | null }) {
  // When status is 'booked' but a worker is already assigned, the worker is
  // en route — show "Worker Visiting" (index 1) instead of "Booking Placed" (index 0).
  const currentIndex = (status === 'booked' && workerId) ? 1 : getStepIndex(status)
  const total = JOURNEY_STEPS.length
  const progressPct = total > 1 ? (currentIndex / (total - 1)) * 100 : 0

  return (
    <div className="relative flex items-start w-full">

      {/* Background rail */}
      <div className="absolute left-4 right-4 h-0.5 bg-slate-700" style={{ top: 14 }} />

      {/* Animated filled rail */}
      <div
        className="absolute left-4 h-0.5 bg-orange-500"
        style={{
          top: 14,
          width: `calc(${progressPct}% * (100% - 32px) / 100)`,
          transition: 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {JOURNEY_STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex

        return (
          <div key={step.status} className="flex-1 flex flex-col items-center" style={{ zIndex: 1 }}>
            {/* Icon */}
            <div className="relative flex items-center justify-center" style={{ width: 28, height: 28 }}>
              {/* Pulse ring on active */}
              {active && (
                <div
                  className="absolute inset-0 rounded-full bg-orange-500 opacity-30"
                  style={{ animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }}
                />
              )}
              <div
                className="rounded-full flex items-center justify-center text-xs transition-all duration-500"
                style={{
                  width: 28,
                  height: 28,
                  background: done || active ? '#f97316' : '#334155',
                  color: done || active ? '#fff' : '#64748b',
                  boxShadow: active ? '0 0 0 3px rgba(249,115,22,0.25)' : 'none',
                  transform: active ? 'scale(1.15)' : 'scale(1)',
                  transition: 'background 500ms, box-shadow 500ms, transform 300ms',
                }}
              >
                {step.icon}
              </div>
            </div>

            {/* Label */}
            <p
              className="text-center leading-tight mt-1.5 px-0.5 transition-colors duration-500"
              style={{
                fontSize: 8.5,
                color: active ? '#f97316' : done ? '#cbd5e1' : '#475569',
                fontWeight: active ? 700 : done ? 600 : 400,
                wordBreak: 'break-word',
              }}
            >
              {step.label}
            </p>
          </div>
        )
      })}

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
