// Simple in-memory rate limiter (trong production nên dùng Redis)

interface RateLimitEntry {
  count: number
  resetTime: number
  blockedUntil?: number
}

const rateLimits = new Map<string, RateLimitEntry>()

// Clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimits.entries()) {
    if (entry.resetTime < now || (entry.blockedUntil && entry.blockedUntil < now)) {
      rateLimits.delete(key)
    }
  }
}, 5 * 60 * 1000)

// Generic rate limit function
function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  blockDurationMs?: number
): { allowed: boolean; remainingTime?: number } {
  const now = Date.now()
  const entry = rateLimits.get(key)

  // Reset counter if window has passed
  if (!entry || entry.resetTime < now) {
    rateLimits.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return { allowed: true }
  }

  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remainingTime: Math.ceil((entry.blockedUntil - now) / 1000)
    }
  }

  // Increment counter
  entry.count++

  // Check if limit exceeded
  if (entry.count > maxAttempts) {
    if (blockDurationMs) {
      entry.blockedUntil = now + blockDurationMs
    }
    return {
      allowed: false,
      remainingTime: blockDurationMs ? Math.ceil(blockDurationMs / 1000) : undefined
    }
  }

  return { allowed: true }
}

// Rate limit cho gửi OTP (5 lần/giờ, block 15 phút)
export function checkOTPSendLimit(email: string): { allowed: boolean; remainingTime?: number } {
  return checkRateLimit(
    `otp_send_${email}`,
    5, // max 5 attempts
    60 * 60 * 1000, // 1 hour window
    15 * 60 * 1000 // block 15 minutes
  )
}

// Rate limit cho verify OTP (5 lần/10 phút, block 5 phút)
export function checkOTPVerifyLimit(transactionId: string): { allowed: boolean; remainingTime?: number } {
  return checkRateLimit(
    `otp_verify_${transactionId}`,
    5, // max 5 attempts
    10 * 60 * 1000, // 10 minutes window
    5 * 60 * 1000 // block 5 minutes
  )
}

// Rate limit cho login attempts (10 lần/15 phút, block 15 phút)
export function checkLoginLimit(identifier: string): { allowed: boolean; remainingTime?: number } {
  return checkRateLimit(
    `login_${identifier}`,
    10, // max 10 attempts
    15 * 60 * 1000, // 15 minutes window
    15 * 60 * 1000 // block 15 minutes
  )
}

// Reset rate limit counter (sử dụng sau khi login thành công)
export function resetLoginLimit(identifier: string): void {
  rateLimits.delete(`login_${identifier}`)
}