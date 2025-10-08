import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'

// Helper function to verify user token
function verifyUserToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization header missing', status: 401 }
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return { userId: decoded.userId, email: decoded.email, role: decoded.role }
  } catch (error) {
    return { error: 'Invalid or expired token', status: 401 }
  }
}


// GET /api/cart - Get user's cart items
export async function GET(request: NextRequest) {
  try {
    // Verify user token
    const authResult = verifyUserToken(request)
    if (authResult.error) {
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

  } catch (error) {
    console.error('GET cart error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}


// POST /api/cart - Add item to cart
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

    const userId = authResult.userId
    const body = await request.json()
    const { productId, quantity = 1, size } = body

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product ID is required'
        },
        { status: 400 }
      )
    }

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found'
        },
        { status: 404 }
      )
    }

    if (!product.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product is not available'
        },
        { status: 400 }
      )
    }

    // Check if item already exists in cart
    const existingCartItem = await prisma.cart.findFirst({
      where: {
        userId,
        productId,
        size: size ?? null
      }
    })

    // Use the exact quantity from frontend (replace current quantity)
    const newQuantity = quantity

    // Check stock availability for the requested quantity
    if (product.stock < newQuantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient stock. Available: ${product.stock}, Requested: ${newQuantity}`
        },
        { status: 400 }
      )
    }

    // Check size stock if size is specified and product has sizes
    if (size && product.sizes) {
      const sizes = product.sizes as any[]
      const sizeInfo = sizes.find((s: any) => s.name === size)

      if (!sizeInfo) {
        return NextResponse.json(
          {
            success: false,
            error: 'Selected size is not available for this product'
          },
          { status: 400 }
        )
      }

      if (sizeInfo.stock < newQuantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for size ${size}. Available: ${sizeInfo.stock}, Requested: ${newQuantity}`
          },
          { status: 400 }
        )
      }
    }

    let cartItem

    if (existingCartItem) {
      // If quantity is 0, remove the item from cart
      if (quantity <= 0) {
        await prisma.cart.delete({
          where: { id: existingCartItem.id }
        })

        return NextResponse.json({
          success: true,
          message: 'Item removed from cart successfully'
        })
      }

      // Update quantity if item exists (replace current quantity)
      cartItem = await prisma.cart.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
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
    } else {
      // Create new cart item
      cartItem = await prisma.cart.create({
        data: {
          userId,
          productId,
          quantity,
          size: size ?? null  // ✅ Sử dụng null cho optional field
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
    }

    return NextResponse.json({
      success: true,
      message: existingCartItem
        ? `The quantity of products in the cart has been updated. (+${quantity})`
        : `The product has been added to the cart. (${quantity})`,
      data: cartItem
    })

  } catch (error) {
    console.error('POST cart error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}


// DELETE /api/cart - Remove item from cart or clear entire cart
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

  } catch (error) {
    console.error('DELETE cart error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}