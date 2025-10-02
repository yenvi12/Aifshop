import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProductSchema, updateProductSchema } from '@/lib/validation'

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

    if (id) {
      // Get specific product
      const product = await prisma.product.findUnique({
        where: { id }
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
      // List all products
      const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({
        success: true,
        data: products
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
    let data: any = {}

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData()

      // Extract text fields
      data.name = formData.get('name') as string
      data.description = (formData.get('description') as string) || null
      data.price = parseFloat(formData.get('price') as string)
      data.category = formData.get('category') as string
      data.stock = parseInt(formData.get('stock') as string) || 0
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

    const { name, description, price, category, image, images, stock, isActive } = validationResult.data

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
        category,
        image,
        images,
        stock,
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

    const body = await request.json()

    // Validate input
    const validationResult = updateProductSchema.safeParse(body)
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