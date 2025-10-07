import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProductSchema, updateProductSchema } from '@/lib/validation'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'

// Helper function to verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization header missing', status: 401 }
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.role !== 'ADMIN') {
      return { error: 'Admin access required', status: 403 }
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role }
  } catch (error) {
    return { error: 'Invalid or expired token', status: 401 }
  }
}

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')                // tách dấu
    .replace(/[\u0300-\u036f]/g, '') // xóa dấu
    .replace(/[^a-z0-9\s-]/g, '')    // chỉ giữ lại ký tự a-z, số, khoảng trắng, -
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// Helper function to upload file to Cloudinary
async function uploadToCloudinary(file: File): Promise<string> {
  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.secure_url as string;
}

// GET - List all products or get specific product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const slug = searchParams.get('slug')

    // Check if this is an admin request
    const authHeader = request.headers.get('authorization')
    const isAdminRequest = authHeader && authHeader.startsWith('Bearer ')

    if (id) {
      // Get specific product by id
      const product = await prisma.product.findUnique({
        where: { id, ...(isAdminRequest ? {} : { isActive: true }) }
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

      return NextResponse.json({
        success: true,
        data: product
      })
    } else if (slug) {
      // Get specific product by slug
      const product = await prisma.product.findUnique({
        where: { slug, ...(isAdminRequest ? {} : { isActive: true }) }
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

      return NextResponse.json({
        success: true,
        data: product
      })
    } else {
      // List all products with pagination and filters
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '6')
      const search = searchParams.get('search') || ''
      const category = searchParams.get('category') || ''
      const status = searchParams.get('status') || ''
      const skip = (page - 1) * limit

      const whereClause: any = isAdminRequest ? {} : { isActive: true }

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (category) {
        whereClause.category = category
      }

      if (status) {
        whereClause.isActive = status === 'active'
      }

      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.product.count({
          where: whereClause
        })
      ])

      const totalPages = Math.ceil(totalCount / limit)

      return NextResponse.json({
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      })
    }
  } catch (error) {
    console.error('GET products error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authResult = verifyAdminToken(request)
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }
    let data: any = {}

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData()

      // Extract text fields
      data.name = formData.get('name') as string
      data.description = (formData.get('description') as string) || null
      data.price = formData.get('price') ? parseFloat(formData.get('price') as string) : null
      data.compareAtPrice = formData.get('compareAtPrice') ? parseFloat(formData.get('compareAtPrice') as string) : null
      data.category = formData.get('category') as string
      data.stock = parseInt(formData.get('stock') as string) || 0
      data.sizes = formData.get('sizes') ? JSON.parse(formData.get('sizes') as string) : []
      data.rating = formData.get('rating') ? parseFloat(formData.get('rating') as string) : 0
      data.badge = (formData.get('badge') as string) || null
      data.isActive = formData.get('isActive') === 'true'

      // Handle main image
      const imageFile = formData.get('image') as File | null
      if (imageFile) {
        if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid image type for main image. Allowed: jpeg, png, gif, webp, svg'
            },
            { status: 400 }
          )
        }
        data.image = await uploadToCloudinary(imageFile)
      } else {
        data.image = null
      }

      // Handle additional images
      const imagesFiles = formData.getAll('images') as File[]
      if (imagesFiles.length > 5) {
        return NextResponse.json(
          {
            success: false,
            error: 'Maximum 5 additional images allowed'
          },
          { status: 400 }
        )
      }

      for (const file of imagesFiles) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid image type. Allowed: jpeg, png, gif, webp, svg'
            },
            { status: 400 }
          )
        }
      }

      data.images = imagesFiles.length > 0
        ? await Promise.all(imagesFiles.map(file => uploadToCloudinary(file)))
        : []
    } else {
      // Handle JSON
      data = await request.json()
      data.description = data.description ?? null
      data.image = data.image ?? null
      data.images = data.images ?? []
    }

    // Validate input
    const validationResult = createProductSchema.safeParse(data)
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

    const { name, description, price, compareAtPrice, category, image, images, stock, sizes, rating, badge, isActive } = validationResult.data

    // Additional validations
    if (price !== null && price !== undefined && compareAtPrice < price) {
      return NextResponse.json(
        {
          success: false,
          error: 'Giá gốc (Sale) phải lớn hơn hoặc bằng giá bán'
        },
        { status: 400 }
      )
    }

    if (sizes && Array.isArray(sizes) && sizes.length > 0) {
      const totalSizeStock = sizes.reduce((sum: number, size: any) => sum + (size.stock || 0), 0);
      if (totalSizeStock > stock) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tổng số lượng size không được vượt quá số lượng tồn kho'
          },
          { status: 400 }
        )
      }
    }

    // Generate slug
    const slug = generateSlug(name)

    // Check if slug already exists
    const existingProduct = await prisma.product.findUnique({
      where: { slug }
    })

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product with this name already exists'
        },
        { status: 409 }
      )
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        compareAtPrice,
        category,
        image,
        images,
        stock,
        sizes,
        rating,
        badge,
        isActive,
        slug,
      } as any
    })

    return NextResponse.json(
      {
        success: true,
        data: product
      },
      { status: 201 }
    )

  } catch (error: any) {
  console.error('POST product error:', error)
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      details: error.message || error
    },
    { status: 500 }
  )
}
}



// PUT - Update existing product
export async function PUT(request: NextRequest) {
  try {
    // Verify admin token
    const authResult = verifyAdminToken(request)
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product ID is required'
        },
        { status: 400 }
      )
    }

    // Check if product exists first
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    })

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found'
        },
        { status: 404 }
      )
    }

    let data: any = {}

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData()

      // Extract text fields
      const name = formData.get('name') as string
      if (name) data.name = name

      const description = formData.get('description') as string
      if (description) data.description = description

      const priceStr = formData.get('price') as string
      if (priceStr && !isNaN(parseFloat(priceStr))) {
        data.price = parseFloat(priceStr)
      }

      const compareAtPriceStr = formData.get('compareAtPrice') as string
      if (compareAtPriceStr && !isNaN(parseFloat(compareAtPriceStr))) {
        data.compareAtPrice = parseFloat(compareAtPriceStr)
      }

      const category = formData.get('category') as string
      if (category) data.category = category

      const stockStr = formData.get('stock') as string
      if (stockStr && !isNaN(parseInt(stockStr))) {
        data.stock = parseInt(stockStr)
      }

      const sizesStr = formData.get('sizes') as string
      if (sizesStr) {
        try {
          data.sizes = JSON.parse(sizesStr)
        } catch (e) {
          data.sizes = []
        }
      }

      const ratingStr = formData.get('rating') as string
      if (ratingStr && !isNaN(parseFloat(ratingStr))) {
        data.rating = parseFloat(ratingStr)
      }

      const badge = formData.get('badge') as string
      if (badge) data.badge = badge

      data.isActive = formData.get('isActive') === 'true'

      // Handle main image
      const imageFile = formData.get('image') as File | null
      const removeMainImage = formData.get('removeMainImage') === 'true'

      if (removeMainImage) {
        data.image = null // Will be set to null in database to remove the image
      } else if (imageFile) {
        if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid image type for main image. Allowed: jpeg, png, gif, webp, svg'
            },
            { status: 400 }
          )
        }
        data.image = await uploadToCloudinary(imageFile)
      }
      // If no new image and not removing, don't include image in update data to keep existing

      // Handle additional images
      const imagesFiles = formData.getAll('images') as File[]
      const imagesToRemoveStr = formData.get('imagesToRemove') as string
      const imagesToRemove = imagesToRemoveStr ? JSON.parse(imagesToRemoveStr) : []

      if (imagesFiles.length > 5) {
        return NextResponse.json(
          {
            success: false,
            error: 'Maximum 5 additional images allowed'
          },
          { status: 400 }
        )
      }

      for (const file of imagesFiles) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid image type. Allowed: jpeg, png, gif, webp, svg'
            },
            { status: 400 }
          )
        }
      }

      // Update images: keep existing ones (minus removed), add new ones
      if (imagesFiles.length > 0 || imagesToRemove.length > 0) {
        const currentImages = existingProduct.images || []
        const remainingImages = currentImages.filter(img => !imagesToRemove.includes(img))
        const newImages = imagesFiles.length > 0
          ? await Promise.all(imagesFiles.map(file => uploadToCloudinary(file)))
          : []
        data.images = [...remainingImages, ...newImages]
      }
      // If no changes to images, don't include images in update data to keep existing
    } else {
      // Handle JSON
      data = await request.json()
      data.description = data.description ?? null
      // For JSON updates, if image is not provided or is null, don't include it to keep existing
      if (!data.image) {
        delete data.image
      }
      if (!data.images || data.images.length === 0) {
        delete data.images
      }
    }

    // Validate input
    const validationResult = updateProductSchema.safeParse(data)
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

    let updateData: any = validationResult.data

    // Generate new slug if name is being updated
    if (updateData.name && updateData.name !== existingProduct.name) {
      updateData.slug = generateSlug(updateData.name)

      // Check if new slug conflicts with another product
      const slugConflict = await prisma.product.findFirst({
        where: {
          slug: updateData.slug,
          id: { not: id }
        }
      })

      if (slugConflict) {
        return NextResponse.json(
          {
            success: false,
            error: 'Product with this name already exists'
          },
          { status: 409 }
        )
      }
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: product
    })

  } catch (error) {
    console.error('PUT product error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin token
    const authResult = verifyAdminToken(request)
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product ID is required'
        },
        { status: 400 }
      )
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    })

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found'
        },
        { status: 404 }
      )
    }

    // Delete product
    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })

  } catch (error) {
    console.error('DELETE product error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}