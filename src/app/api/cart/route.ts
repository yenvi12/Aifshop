import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'

// Define TypeScript interfaces
interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

interface SizeInfo {
  name: string
  stock: number
}

// Helper function to verify user token
function verifyUserToken(request: NextRequest): { success: true, userId: string, email: string, role: string } | { success: false, error: string, status: number } {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Authorization header missing', status: 401 }
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return { success: true, userId: decoded.userId, email: decoded.email, role: decoded.role }
  } catch {
    return { success: false, error: 'Invalid or expired token', status: 401 }
  }
}


// GET /api/cart - Get user's cart items
export async function GET(request: NextRequest) {
  try {
    // Verify user token
    const authResult = verifyUserToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = authResult.userId

    // Get all cart items for the user
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            compareAtPrice: true,
            image: true,
            images: true,
            stock: true,
            sizes: true,
            badge: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: cartItems
    })

  } catch (err) {
    console.error('GET cart error:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}


// POST /api/cart - Add or update cart item
export async function POST(request: NextRequest) {
  try {
    // ✅ Verify user token
    const authResult = verifyUserToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = authResult.userId
    const body = await request.json()
    const { productId, quantity = 1, size } = body

    // ✅ Validate required fields
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // ✅ Check product exists and is active
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }
    if (!product.isActive) {
      return NextResponse.json(
        { success: false, error: 'Product is not available' },
        { status: 400 }
      )
    }

    // ✅ Check stock availability
    if (product.stock < quantity) {
      return NextResponse.json(
        { success: false, error: `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}` },
        { status: 400 }
      )
    }

    // ✅ Validate size if product has sizes
    if (product.sizes) {
      if (!size) {
        return NextResponse.json(
          { success: false, error: 'Size is required for this product' },
          { status: 400 }
        )
      }

      const sizes = product.sizes as unknown as SizeInfo[]
      const sizeInfo = sizes.find((s: SizeInfo) => s.name === size)

      if (!sizeInfo) {
        return NextResponse.json(
          { success: false, error: 'Selected size is not available for this product' },
          { status: 400 }
        )
      }

      if (sizeInfo.stock < quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for size ${size}. Available: ${sizeInfo.stock}, Requested: ${quantity}` },
          { status: 400 }
        )
      }
    }

    // ✅ Nếu quantity <= 0 → xóa cart item
    if (quantity <= 0) {
      await prisma.cart.deleteMany({
        where: {
          userId,
          productId,
          size: size ?? null
        }
      })
      return NextResponse.json({
        success: true,
        message: 'Item removed from cart successfully'
      })
    }

    // ✅ Thêm hoặc cập nhật cart item (dùng upsert để tránh lỗi P2002)
    const cartItem = await prisma.cart.upsert({
      where: {
        userId_productId_size: {
          userId,
          productId,
          size: size ?? null
        }
      },
      update: { quantity },
      create: {
        userId,
        productId,
        quantity,
        size: size ?? null
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            compareAtPrice: true,
            image: true,
            images: true,
            stock: true,
            sizes: true,
            badge: true,
            slug: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Cart updated successfully (Quantity: ${quantity})`,
      data: cartItem
    })

  } catch (err) {
    console.error('POST cart error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}



// DELETE /api/cart - Remove item from cart or clear entire cart
export async function DELETE(request: NextRequest) {
  try {
    // Verify user token
    const authResult = verifyUserToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = authResult.userId
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')!
    const sizeParam = searchParams.get('size')
    const clearAll = searchParams.get('clearAll') === 'true'

    if (clearAll) {
      // Clear entire cart
      await prisma.cart.deleteMany({
        where: { userId }
      })

      return NextResponse.json({
        success: true,
        message: 'Cart cleared successfully'
      })
    }

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product ID is required'
        },
        { status: 400 }
      )
    }

    // Find and delete specific cart item
    const cartItem = await prisma.cart.findFirst({
      where: {
        userId,
        productId
      }
    })

    if (!cartItem) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cart item not found'
        },
        { status: 404 }
      )
    }

    await prisma.cart.delete({
      where: { id: cartItem.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart successfully'
    })

  } catch (err) {
    console.error('DELETE cart error:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}