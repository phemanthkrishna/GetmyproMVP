const API_KEY = import.meta.env.VITE_2FACTOR_API_KEY as string

export interface OtpSession {
  sessionId: string
  phone: string
}

export async function sendOtp(phone: string): Promise<string> {
  // Demo mode: if no API key, return a fake session ID
  if (!API_KEY || API_KEY === 'your-2factor-api-key') {
    console.warn('2factor.in key not set — demo mode, OTP is "1234"')
    return 'demo-session-' + Date.now()
  }

  const res = await fetch(
    `https://2factor.in/API/V1/${API_KEY}/SMS/${phone}/AUTOGEN`,
    { method: 'GET' }
  )
  const data = await res.json()
  if (data.Status !== 'Success') {
    throw new Error(data.Details || 'Failed to send OTP')
  }
  return data.Details as string // session ID
}

export async function verifyOtp(sessionId: string, otp: string): Promise<boolean> {
  // Universal test OTP — always accepted for testing
  if (otp === '123456') return true

  // Demo mode
  if (sessionId.startsWith('demo-session-')) {
    return otp === '123456'
  }

  const res = await fetch(
    `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otp}`,
    { method: 'GET' }
  )
  const data = await res.json()
  return data.Status === 'Success'
}
