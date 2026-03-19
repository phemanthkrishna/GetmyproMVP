import { JOURNEY_STEPS, getStepIndex } from '../constants'

export function JourneyTracker({ status }: { status: string }) {
  const currentIndex = getStepIndex(status)

  return (
    <div className="w-full overflow-x-auto -mx-1 px-1 pb-1">
      <div className="flex items-start" style={{ minWidth: `${JOURNEY_STEPS.length * 72}px` }}>
        {JOURNEY_STEPS.map((step, i) => {
          const done = i < currentIndex
          const active = i === currentIndex

          return (
            <div key={step.status} className="flex-1 flex flex-col items-center relative">
              {/* Connector line — left half */}
              {i > 0 && (
                <div
                  className={`absolute top-4 right-1/2 left-0 h-0.5 ${
                    done || active ? 'bg-orange-500' : 'bg-slate-700'
                  }`}
                />
              )}
              {/* Connector line — right half */}
              {i < JOURNEY_STEPS.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 right-0 h-0.5 ${
                    done ? 'bg-orange-500' : 'bg-slate-700'
                  }`}
                />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                  done || active ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-500'
                } ${active ? 'ring-2 ring-orange-500/40' : ''}`}
              >
                {step.icon}
              </div>

              {/* Label */}
              <p
                className={`mt-1.5 text-center leading-tight px-0.5 ${
                  active ? 'text-orange-400 font-bold' : done ? 'text-slate-300 font-semibold' : 'text-slate-600'
                }`}
                style={{ fontSize: 9 }}
              >
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
