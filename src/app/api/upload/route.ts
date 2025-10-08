import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

// Helper function to verify user token
function verifyUserToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization header missing', status: 401 }
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.type !== 'access') {
      return { error: 'Invalid token type', status: 401 }
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role }
  } catch (error) {
    return { error: 'Invalid or expired token', status: 401 }
  }
}

// POST - Upload files to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    // Verify user token
    const authResult = verifyUserToken(request)
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const folder = formData.get('folder') as string || 'reviews'

    if (!files.length) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      )
    }

    const uploadedUrls: string[] = []

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        return NextResponse.json(
          { success: false, error: 'Only image and video files are allowed' },
          { status: 400 }
        )
      }

      // Validate file size based on type
      const isVideo = file.type.startsWith('video/')
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB for videos, 10MB for images
      const sizeLimitText = isVideo ? '50MB' : '10MB'

      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: `File size must be less than ${sizeLimitText}` },
          { status: 400 }
        )
      }

      // Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)
      formData.append('folder', folder)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Cloudinary upload error:', result)
        return NextResponse.json(
          { success: false, error: 'Failed to upload file' },
          { status: 500 }
        )
      }

      uploadedUrls.push(result.secure_url)
    }

    return NextResponse.json({
      success: true,
      data: {
        urls: uploadedUrls
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}