import { useRef, KeyboardEvent, ClipboardEvent } from 'react'

interface OtpInputProps {
  value: string
  onChange: (val: string) => void
  length?: number
}

export function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.split('').slice(0, length)

  function handleChange(index: number, char: string) {
    if (!/^\d*$/.test(char)) return
    const next = [...Array(length).keys()].map(i => digits[i] || '')
    next[index] = char.slice(-1)
    onChange(next.join(''))
    if (char && index < length - 1) refs.current[index + 1]?.focus()
  }

  function handleKey(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    const focusIndex = Math.min(pasted.length, length - 1)
    refs.current[focusIndex]?.focus()
  }

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          className="otp-digit"
        />
      ))}
    </div>
  )
}
