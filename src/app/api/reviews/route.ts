import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createReviewSchema, updateReviewSchema } from '@/lib/validation'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'

// Type definitions for Prisma queries (since client is not generated)
interface ReviewRating {
  rating: number
}

interface ReviewWithUser {
  id: string
  userId: string
  productId: string
  rating: number
  comment: string
  images: string[]
  videos: string[]
  createdAt: Date
  user: {
    id: string
    firstName: string
    lastName: string
    avatar?: string | null
  }
}

interface ReviewBasic {
  id: string
  userId: string
  productId: string
  isActive: boolean
}

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

// Helper function to calculate and update product rating
async function updateProductRating(productId: string) {
  // Get all active reviews for this product
  const reviews: ReviewRating[] = await (prisma as any).review?.findMany({
    where: {
      productId,
      isActive: true
    },
    select: {
      rating: true
    }
  }) || []

  if (reviews.length === 0) {
    // No reviews, set rating to 0
    await prisma.product.update({
      where: { id: productId },
      data: { rating: 0 }
    })
    return 0
  }

  // Calculate average rating
  const totalRating = reviews.reduce((sum: number, review: ReviewRating) => sum + review.rating, 0)
  const averageRating = totalRating / reviews.length

  // Round to 1 decimal place
  const roundedRating = Math.round(averageRating * 10) / 10

  await prisma.product.update({
    where: { id: productId },
    data: { rating: roundedRating }
  })

  return roundedRating
}

// GET - List reviews for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Get reviews with user information
    const reviews: ReviewWithUser[] = await (prisma as any).review?.findMany({
      where: {
        productId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }) || []

    // Transform data for frontend
    const transformedReviews = reviews.map((review: ReviewWithUser) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      images: review.images,
      videos: review.videos,
      createdAt: review.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
      user: {
        id: review.user.id,
        name: `${review.user.firstName} ${review.user.lastName}`,
        avatar: review.user.avatar
      }
    }))

    return NextResponse.json({
      success: true,
      data: transformedReviews
    })

  } catch (error) {
    console.error('GET reviews error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new review
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

    const data = await request.json()

    // Add userId to data
    data.userId = authResult.userId

    // Validate input
    const validationResult = createReviewSchema.safeParse(data)
    if (!validationResult.success) {
      console.error('Review validation failed:', validationResult.error.format())
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      )
    }

    const { productId, userId, rating, comment, images, videos } = validationResult.data

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if user already has a review for this product
    const existingReview: ReviewBasic | null = await (prisma as any).review?.findFirst({
      where: {
        productId,
        userId
      },
      select: {
        id: true,
        userId: true,
        productId: true
      }
    })

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this product' },
        { status: 409 }
      )
    }

    // Create new review
    const review = await (prisma as any).review.create({
      data: {
        productId,
        userId,
        rating,
        comment,
        images,
        videos
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    })

    // Update product rating
    await updateProductRating(productId)

    // Transform data for response
    const transformedReview = {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      images: review.images,
      videos: review.videos,
      createdAt: review.createdAt.toISOString().split('T')[0],
      user: {
        id: review.user.id,
        name: `${review.user.firstName} ${review.user.lastName}`,
        avatar: review.user.avatar
      }
    }

    return NextResponse.json(
      { success: true, data: transformedReview },
      { status: 201 }
    )

  } catch (error) {
    console.error('POST review error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update existing review
export async function PUT(request: NextRequest) {
  try {
    // Verify user token
    const authResult = verifyUserToken(request)
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('id')

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      )
    }

    // Check if review exists and belongs to user
    const existingReview: ReviewWithUser | null = await (prisma as any).review?.findUnique({
      where: { id: reviewId },
      include: { user: true }
    }) || null

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      )
    }

    if (existingReview.userId !== authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own reviews' },
        { status: 403 }
      )
    }

    const data = await request.json()

    // Validate input
    const validationResult = updateReviewSchema.safeParse(data)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      )
    }

    // Update review
    const review = await (prisma as any).review.update({
      where: { id: reviewId },
      data: validationResult.data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    })

    // Update product rating
    await updateProductRating(existingReview.productId)

    // Transform data for response
    const transformedReview = {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      images: review.images,
      videos: review.videos,
      createdAt: review.createdAt.toISOString().split('T')[0],
      user: {
        id: review.user.id,
        name: `${review.user.firstName} ${review.user.lastName}`,
        avatar: review.user.avatar
      }
    }

    return NextResponse.json({
      success: true,
      data: transformedReview
    })

  } catch (error) {
    console.error('PUT review error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete review
export async function DELETE(request: NextRequest) {
  try {
    // Verify user token
    const authResult = verifyUserToken(request)
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('id')

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      )
    }

    // Check if review exists and belongs to user
    const existingReview: ReviewBasic | null = await (prisma as any).review?.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        productId: true,
        isActive: true
      }
    }) || null

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      )
    }

    if (existingReview.userId !== authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own reviews' },
        { status: 403 }
      )
    }

    const productId = existingReview.productId

    // Hard delete review
    await (prisma as any).review.delete({
      where: { id: reviewId }
    })

    // Update product rating
    await updateProductRating(productId)

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })

  } catch (error) {
    console.error('DELETE review error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}