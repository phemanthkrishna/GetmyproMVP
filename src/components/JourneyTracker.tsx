import { JOURNEY_STEPS, getStepIndex } from '../constants'

export function JourneyTracker({ status }: { status: string }) {
  const currentIndex = getStepIndex(status)

  return (
    <div className="flex flex-col gap-0">
      {JOURNEY_STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        const future = i > currentIndex

        return (
          <div key={step.status} className="flex items-start gap-3">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                  done || active
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-slate-500'
                } ${active ? 'ring-2 ring-orange-500/40' : ''}`}
              >
                {step.icon}
              </div>
              {i < JOURNEY_STEPS.length - 1 && (
                <div
                  className={`w-0.5 h-6 mt-1 ${done ? 'bg-orange-500' : 'bg-slate-700'}`}
                />
              )}
            </div>
            {/* Label */}
            <div className="pb-6 pt-1">
              <p
                className={`text-sm font-semibold ${
                  done || active ? 'text-slate-50' : 'text-slate-500'
                }`}
              >
                {step.label}
              </p>
              {active && (
                <p className="text-xs text-orange-400 mt-0.5">Current step</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
