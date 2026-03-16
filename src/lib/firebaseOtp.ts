import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth'
import { auth } from './firebase'

export type { ConfirmationResult, RecaptchaVerifier }

export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  const el = document.getElementById(containerId)
  if (!el) throw new Error(`reCAPTCHA container #${containerId} not found`)
  return new RecaptchaVerifier(el, { size: 'invisible' }, auth)
}

export async function sendOtp(
  phone: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, `+91${phone}`, verifier)
}

export async function verifyOtp(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<boolean> {
  try {
    await confirmationResult.confirm(otp)
    return true
  } catch {
    return false
  }
}
