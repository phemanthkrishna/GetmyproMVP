import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth'
import { auth } from './firebase'

export type { ConfirmationResult, RecaptchaVerifier }

export function createRecaptchaVerifier(
  containerId: string,
  onVerified?: () => void,
  onExpired?: () => void
): RecaptchaVerifier {
  const el = document.getElementById(containerId)
  if (!el) throw new Error(`reCAPTCHA container #${containerId} not found`)
  return new RecaptchaVerifier(
    el,
    {
      size: 'normal',
      callback: onVerified,
      'expired-callback': onExpired,
    },
    auth
  )
}

/** Translate Firebase error codes into plain English for the user. */
export function firebaseAuthMessage(err: unknown): string {
  const code = (err as any)?.code ?? ''
  // Always log the raw error so it appears in Logcat / browser console
  console.error('[FirebaseAuth] code:', code, '| message:', (err as any)?.message)
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Invalid phone number. Enter a valid 10-digit number.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded. Try again later.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/invalid-verification-code':
    case 'auth/invalid-credential':
      return 'Incorrect OTP. Please check and try again.'
    case 'auth/code-expired':
      return 'OTP has expired. Please request a new one.'
    case 'auth/missing-verification-code':
      return 'Please enter the 6-digit OTP.'
    case 'auth/invalid-app-credential':
    case 'auth/captcha-check-failed':
      return 'Verification failed. Please try again.'
    case 'auth/unauthorized-domain':
      return 'App domain not authorized. Contact support.'
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection.'
    default:
      return (err as any)?.message || 'Authentication failed. Please try again.'
  }
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
