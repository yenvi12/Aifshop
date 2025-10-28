import { getValidAccessToken } from './tokenManager'

// Custom fetch wrapper with automatic token refresh
export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  // Get valid access token (will refresh if needed)
  const token = await getValidAccessToken()

  // Add authorization header if token exists
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Make the request with updated headers
  const response = await fetch(url, {
    ...options,
    headers
  })

  // If request fails due to expired token, try once more with fresh token
  if (response.status === 401) {
    const errorData = await response.clone().json().catch(() => ({}))
    if (errorData.error?.includes('Invalid') || errorData.error?.includes('expired')) {
      // Try to refresh token and retry request
      const freshToken = await getValidAccessToken()
      if (freshToken && freshToken !== token) {
        headers.set('Authorization', `Bearer ${freshToken}`)
        return fetch(url, {
          ...options,
          headers
        })
      }
    }
  }

  return response
}

// Convenience methods for common HTTP methods
export const apiClient = {
  get: (url: string, options: RequestInit = {}) =>
    apiRequest(url, { ...options, method: 'GET' }),

  post: (url: string, data?: unknown, options: RequestInit = {}) =>
    apiRequest(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined
    }),

  put: (url: string, data?: unknown, options: RequestInit = {}) =>
    apiRequest(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined
    }),

  delete: (url: string, options: RequestInit = {}) =>
    apiRequest(url, { ...options, method: 'DELETE' })
}