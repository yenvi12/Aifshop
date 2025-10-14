import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'

export interface TokenPayload {
  userId: string
  email: string
  role: string
  type: string
  iat: number
  exp: number
}

// Utility function to decode JWT token without verification
export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload as TokenPayload
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

// Check if token is expired
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token)
  if (!payload) return true

  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp < currentTime
}

// Check if token will expire soon (within 5 minutes)
export function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeToken(token)
  if (!payload) return true

  const currentTime = Math.floor(Date.now() / 1000)
  const fiveMinutesFromNow = currentTime + (5 * 60)
  return payload.exp < fiveMinutesFromNow
}

// Refresh access token using refresh token
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('No refresh token found')
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    const data = await response.json()

    if (data.success) {
      localStorage.setItem('accessToken', data.accessToken)
      return data.accessToken
    } else {
      throw new Error(data.error || 'Failed to refresh token')
    }
  } catch (error) {
    console.error('Error refreshing token:', error)
    // Clear tokens on refresh failure
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    return null
  }
}

// Get valid access token, refresh if needed
export async function getValidAccessToken(): Promise<string | null> {
  let token = localStorage.getItem('accessToken')

  if (!token) {
    return null
  }

  if (isTokenExpired(token)) {
    // Token expired, try to refresh
    token = await refreshAccessToken()
  } else if (isTokenExpiringSoon(token)) {
    // Token expiring soon, refresh proactively
    const newToken = await refreshAccessToken()
    if (newToken) {
      token = newToken
    }
  }

  return token
}

// Auto refresh token periodically
let refreshInterval: NodeJS.Timeout | null = null

export function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  refreshInterval = setInterval(async () => {
    const token = localStorage.getItem('accessToken')
    if (token && isTokenExpiringSoon(token)) {
      await refreshAccessToken()
    }
  }, 60000) // Check every minute
}

export function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}