import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production-987654321'

// Hash password với Argon2id
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 65536, // 64 MB
    parallelism: 1,
    hashLength: 32
  })
}

// Tạo JWT access token (short-lived) với supabaseUserId
export function generateAccessToken(userId: string, email: string, role: string = 'USER', supabaseUserId?: string): string {
  return jwt.sign(
    { userId, email, role, supabaseUserId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' } // 15 phút
  )
}

// Tạo JWT refresh token (long-lived)
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // 7 ngày
  )
}

// Hash refresh token trước khi lưu DB
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Tạo transaction ID cho OTP session
export function generateTransactionId(): string {
  return crypto.randomUUID()
}

// Verify JWT token without throwing error
export function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// Verify refresh token without throwing error
export function verifyRefreshToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET)
  } catch (error) {
    return null
  }
}