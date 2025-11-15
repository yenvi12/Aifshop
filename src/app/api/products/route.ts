import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProductSchema, updateProductSchema, CreateProductInput, UpdateProductInput } from '@/lib/validation'
import { Prisma } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { normalizeSizes, calculateTotalStock } from '@/lib/inventory'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'

// Helper function to verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization header missing', status: 401 }
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string }
    if (decoded.role !== 'ADMIN') {
      return { error: 'Admin access required', status: 403 }
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role }
  } catch {
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

      const whereClause: Prisma.ProductWhereInput = isAdminRequest ? {} : { isActive: true }

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
    let data: Partial<UpdateProductInput> = {}

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData()

      // Extract text fields
      data.name = formData.get('name') as string
      data.overview = (formData.get('overview') as string) || undefined
      data.description = (formData.get('description') as string) || undefined
      data.price = formData.get('price') ? parseFloat(formData.get('price') as string) : null
      data.compareAtPrice = formData.get('compareAtPrice') ? parseFloat(formData.get('compareAtPrice') as string) : undefined
      data.category = formData.get('category') as string

      const rawSizes = formData.get('sizes') ? JSON.parse(formData.get('sizes') as string) : []
      const normalizedSizes = normalizeSizes(rawSizes)

      if (normalizedSizes.length > 0) {
        // Product has sizes: stock is derived from sizes
        data.sizes = normalizedSizes as any
        data.stock = calculateTotalStock(normalizedSizes)
      } else {
        // No valid sizes: treat as no-size product, use stock from input
        const stockStr = formData.get('stock') as string
        const stockVal = stockStr ? parseInt(stockStr, 10) : 0
        data.stock = Number.isFinite(stockVal) && stockVal >= 0 ? stockVal : 0
        data.sizes = []
      }

      // Rating is now calculated from reviews, not set manually
      data.badge = (formData.get('badge') as string) || undefined
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
      data.overview = data.overview ?? undefined
      data.description = data.description ?? undefined

      const normalizedSizes = normalizeSizes((data as any).sizes)

      if (normalizedSizes.length > 0) {
        // Has sizes -> derive stock from sizes
        ;(data as any).sizes = normalizedSizes
        data.stock = calculateTotalStock(normalizedSizes)
      } else {
        // No sizes -> treat as simple product, allow explicit stock (>=0)
        const stockVal = Number((data as any).stock)
        data.stock = Number.isFinite(stockVal) && stockVal >= 0 ? Math.floor(stockVal) : 0
        ;(data as any).sizes = []
      }

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

    const { name, overview, description, price, compareAtPrice, category, image, images, stock, sizes, badge, isActive } = validationResult.data

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

    // At this point, if sizes has elements, stock is already derived from sizes.

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
        overview,
        description,
        price,
        compareAtPrice,
        category,
        image,
        images,
        stock,
        sizes,
        rating: 0, // Default to 0, will be calculated from reviews
        badge,
        isActive,
        slug,
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: product
      },
      { status: 201 }
    )

  } catch (error: unknown) {
  console.error('POST product error:', error)
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : error
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

    let data: Partial<CreateProductInput> = {}

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData()

      // Extract text fields
      const name = formData.get('name') as string
      if (name) data.name = name

      const overview = formData.get('overview') as string
      if (overview !== undefined && overview !== null) data.overview = overview || undefined

      const description = formData.get('description') as string
      if (description !== undefined && description !== null) data.description = description || undefined

      const priceStr = formData.get('price') as string
      if (priceStr !== undefined && priceStr !== null) {
        if (priceStr.trim() === '') {
          data.price = null
        } else if (!isNaN(parseFloat(priceStr))) {
          data.price = parseFloat(priceStr)
        }
      }

      const compareAtPriceStr = formData.get('compareAtPrice') as string
      if (compareAtPriceStr && !isNaN(parseFloat(compareAtPriceStr))) {
        data.compareAtPrice = parseFloat(compareAtPriceStr)
      }

      const category = formData.get('category') as string
      if (category) data.category = category

      const sizesStr = formData.get('sizes') as string
      const hasSizesPayload = typeof sizesStr === 'string'

      if (hasSizesPayload) {
        // Caller is explicitly updating sizes
        let parsed: any[] = []
        try {
          parsed = JSON.parse(sizesStr)
        } catch {
          parsed = []
        }
        const normalizedSizes = normalizeSizes(parsed)

        if (normalizedSizes.length > 0) {
          // Product will have sizes: derive stock
          ;(data as any).sizes = normalizedSizes
          data.stock = calculateTotalStock(normalizedSizes)
        } else {
          // sizes provided but all invalid/empty => interpret as removing sizes
          // Use provided stock (if valid) as simple product stock
          const stockStr = formData.get('stock') as string
          const stockVal = stockStr ? parseInt(stockStr, 10) : NaN
          if (Number.isFinite(stockVal) && stockVal >= 0) {
            data.stock = Math.floor(stockVal)
            ;(data as any).sizes = []
          } else {
            return NextResponse.json(
              {
                success: false,
                error: 'Invalid sizes payload. Provide valid sizes or a non-negative stock value when removing sizes.'
              },
              { status: 400 }
            )
          }
        }
      } else {
        // No sizes field in payload:
        // - If existing product has sizes: do NOT allow direct stock override.
        // - If no sizes: allow updating stock if provided.
        const stockStr = formData.get('stock') as string
        if (!existingProduct.sizes || (Array.isArray(existingProduct.sizes) && existingProduct.sizes.length === 0)) {
          if (stockStr && !isNaN(parseInt(stockStr, 10))) {
            const stockVal = parseInt(stockStr, 10)
            if (stockVal >= 0) {
              data.stock = stockVal
            }
          }
        }
        // else: ignore stockStr silently to protect derived stock
      }

      // Rating is now calculated from reviews, not set manually

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
      data.overview = data.overview ?? undefined
      data.description = data.description ?? undefined
      data.price = data.price ?? null
      data.compareAtPrice = data.compareAtPrice ?? undefined
      data.badge = data.badge ?? undefined

      const hasSizesPayload = Object.prototype.hasOwnProperty.call(data, 'sizes')
      if (hasSizesPayload) {
        const normalizedSizes = normalizeSizes((data as any).sizes)
        if (normalizedSizes.length > 0) {
          ;(data as any).sizes = normalizedSizes
          data.stock = calculateTotalStock(normalizedSizes)
        } else {
          // Caller is clearing sizes: require valid stock to become no-size product
          const stockVal = Number((data as any).stock)
          if (Number.isFinite(stockVal) && stockVal >= 0) {
            data.stock = Math.floor(stockVal)
            ;(data as any).sizes = []
          } else {
            return NextResponse.json(
              {
                success: false,
                error: 'When removing sizes, a non-negative stock value is required.'
              },
              { status: 400 }
            )
          }
        }
      } else {
        // No sizes payload: only allow stock update if product currently has no sizes
        if (!existingProduct.sizes || (Array.isArray(existingProduct.sizes) && existingProduct.sizes.length === 0)) {
          if (Object.prototype.hasOwnProperty.call(data, 'stock')) {
            const stockVal = Number((data as any).stock)
            if (Number.isFinite(stockVal) && stockVal >= 0) {
              data.stock = Math.floor(stockVal)
            } else {
              return NextResponse.json(
                {
                  success: false,
                  error: 'Stock must be a non-negative number.'
                },
                { status: 400 }
              )
            }
          }
        } else {
          // Product has sizes: ignore any direct stock field to protect derived stock
          if (Object.prototype.hasOwnProperty.call(data, 'stock')) {
            delete (data as any).stock
          }
        }
      }

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

    const updateData: UpdateProductInput = validationResult.data

    // Generate new slug if name is being updated
    if (updateData.name && updateData.name !== existingProduct.name) {
      const slug = generateSlug(updateData.name)
      ;(updateData as any).slug = slug

      // Check if new slug conflicts with another product
      const slugConflict = await prisma.product.findFirst({
        where: {
          slug,
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