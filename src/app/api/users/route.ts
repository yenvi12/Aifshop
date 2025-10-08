import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateUserSchema } from '@/lib/validation'
import { supabaseAdmin } from '@/lib/supabase-server'
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

// GET - List users with pagination, search, filters
export async function GET(request: NextRequest) {
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const isVerified = searchParams.get('isVerified') || ''
    const skip = (page - 1) * limit

    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      whereClause.role = role
    }

    if (isVerified !== '') {
      whereClause.isVerified = isVerified === 'true'
    }

    // Fetch all users from Supabase Auth
    const { data: supabaseUsers, error: supabaseError } = await supabaseAdmin.auth.admin.listUsers()

    if (supabaseError) {
      console.error('Failed to fetch Supabase users:', supabaseError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users from authentication service' },
        { status: 500 }
      )
    }

    // Fetch all database users
    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        supabaseUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        bio: true,
        avatar: true,
        stylePreferences: true,
        defaultAddress: true,
        isVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Create a map of DB users by supabaseUserId and by email
    const dbUsersMap = new Map()
    const dbUsersByEmail = new Map()

    dbUsers.forEach(dbUser => {
      if (dbUser.supabaseUserId) {
        dbUsersMap.set(dbUser.supabaseUserId, dbUser)
      }
      dbUsersByEmail.set(dbUser.email.toLowerCase(), dbUser)
    })

    // Merge Supabase and DB data
    let mergedUsers = supabaseUsers.users
      .filter(supabaseUser => supabaseUser.email) // Only include users with email
      .map(supabaseUser => {
        const dbUser = dbUsersMap.get(supabaseUser.id) || dbUsersByEmail.get(supabaseUser.email!.toLowerCase())

        return {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          firstName: dbUser?.firstName || null,
          lastName: dbUser?.lastName || null,
          phoneNumber: dbUser?.phoneNumber || null,
          dateOfBirth: dbUser?.dateOfBirth || null,
          bio: dbUser?.bio || null,
          avatar: dbUser?.avatar || null,
          stylePreferences: dbUser?.stylePreferences || [],
          defaultAddress: dbUser?.defaultAddress || null,
          isVerified: dbUser?.isVerified ?? false,
          role: dbUser?.role ?? 'USER',
          createdAt: new Date(supabaseUser.created_at),
          updatedAt: dbUser?.updatedAt || new Date(supabaseUser.created_at),
          emailConfirmedAt: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null,
          hasDatabaseRecord: !!dbUser
        }
      })

    // Apply search filter
    if (search) {
      mergedUsers = mergedUsers.filter(user =>
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(search.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(search.toLowerCase()))
      )
    }

    // Apply role filter
    if (role) {
      mergedUsers = mergedUsers.filter(user => user.role === role)
    }

    // Apply isVerified filter
    if (isVerified !== '') {
      const verifiedFilter = isVerified === 'true'
      mergedUsers = mergedUsers.filter(user => user.isVerified === verifiedFilter)
    }

    // Sort by createdAt desc
    mergedUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply pagination
    const totalCount = mergedUsers.length
    const paginatedUsers = mergedUsers.slice(skip, skip + limit)

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('GET users error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// PUT - Update user details
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
          error: 'User ID is required'
        },
        { status: 400 }
      )
    }

    // Check if user exists in Supabase Auth
    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.getUserById(id)

    if (supabaseError || !supabaseUser.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found in authentication service'
        },
        { status: 404 }
      )
    }

    // Check if user has database record
    let existingUser = await prisma.user.findUnique({
      where: { supabaseUserId: id },
      select: { id: true, role: true, supabaseUserId: true }
    })

    // If no database record, create one with defaults
    if (!existingUser) {
      const { hashPassword } = await import('@/lib/auth')
      const hashedPassword = await hashPassword(supabaseUser.user.email!) // Use email as dummy password

      existingUser = await prisma.user.create({
        data: {
          supabaseUserId: id,
          email: supabaseUser.user.email!,
          firstName: '',
          lastName: '',
          dateOfBirth: new Date('2000-01-01'),
          password: hashedPassword,
          isVerified: false,
          role: 'USER'
        },
        select: { id: true, role: true, supabaseUserId: true }
      })
    }

    const data = await request.json()

    // Validate input
    const validationResult = updateUserSchema.safeParse(data)
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

    let updateData = validationResult.data

    // Security: Prevent modifying own role
    if (updateData.role && id === authResult.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot modify your own role'
        },
        { status: 403 }
      )
    }

    // Update user
    const user = await prisma.user.update({
      where: { supabaseUserId: id },
      data: updateData,
      select: {
        id: true,
        email: true,
        isVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: user
    })

  } catch (error) {
    console.error('PUT user error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete user
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
          error: 'User ID is required'
        },
        { status: 400 }
      )
    }

    // Prevent deleting own account
    if (id === authResult.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete your own account'
        },
        { status: 403 }
      )
    }

    // Check if user exists in Supabase Auth
    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.getUserById(id)

    if (supabaseError || !supabaseUser.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found in authentication service'
        },
        { status: 404 }
      )
    }

    // Check if user has database record
    const existingUser = await prisma.user.findUnique({
      where: { supabaseUserId: id },
      select: { id: true, supabaseUserId: true, email: true }
    })

    // Delete user from Supabase Auth
    try {
      await supabaseAdmin.auth.admin.deleteUser(id)
    } catch (error) {
      console.error('Failed to delete user from Supabase Auth:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete user from authentication service'
        },
        { status: 500 }
      )
    }

    // Delete from Prisma database if exists
    if (existingUser) {
      await prisma.user.delete({
        where: { supabaseUserId: id }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('DELETE user error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}