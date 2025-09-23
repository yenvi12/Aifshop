import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production'

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

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

// Tạo OTP 6 chữ số ngẫu nhiên
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Hash OTP với SHA-256 + salt
export function hashOTP(otp: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.createHash('sha256').update(otp + salt).digest('hex')
  return { hash, salt }
}

// Verify OTP hash
export function verifyOTP(otp: string, hash: string, salt: string): boolean {
  const computedHash = crypto.createHash('sha256').update(otp + salt).digest('hex')
  return computedHash === hash
}

// Tạo JWT access token (short-lived)
export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'access' },
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

// Verify JWT token
export function verifyToken(token: string, type: 'access' | 'refresh' = 'access'): any {
  const secret = type === 'access' ? JWT_SECRET : JWT_REFRESH_SECRET
  try {
    return jwt.verify(token, secret)
  } catch {
    return null
  }
}

// Tạo transaction ID cho OTP session
export function generateTransactionId(): string {
  return crypto.randomUUID()
}