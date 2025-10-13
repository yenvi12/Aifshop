import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-server'

// GET /api/profile - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Find user in DB
    let dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id }
    })

    if (!dbUser) {
      if (user.email) {
        // For authenticated users, create record if not exists
        const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || 'User'
        const lastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''
        const avatar = user.user_metadata?.avatar_url || ''

        dbUser = await prisma.user.create({
          data: {
            supabaseUserId: user.id,
            email: user.email,
            firstName,
            lastName,
            dateOfBirth: new Date('2000-01-01'), // Default birthday
            password: '', // No password for OAuth users
            avatar: avatar || null
          } as any
        })
      } else {
        return NextResponse.json({ error: 'User not found and no email available' }, { status: 404 })
      }
    }

    // Return profile data
    return NextResponse.json({
      id: dbUser.id,
      name: `${dbUser.firstName} ${dbUser.lastName}`,
      email: dbUser.email,
      phone: dbUser.phoneNumber,
      birthday: dbUser.dateOfBirth.toISOString().split('T')[0], // YYYY-MM-DD
      bio: (dbUser as any).bio || '',
      avatar: (dbUser as any).avatar || '',
      stylePreferences: (dbUser as any).stylePreferences || [],
      defaultAddress: (dbUser as any).defaultAddress || { shipping: '', billing: '' }
    })

  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// PUT /api/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Find user in DB
    let dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id }
    })

    // If user not in DB but authenticated with Supabase (e.g., Google), create them
    if (!dbUser) {
      if (user.email) {
        // For Google users, extract name from user_metadata
        const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || 'User'
        const lastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''
        const avatar = user.user_metadata?.avatar_url || ''

        dbUser = await prisma.user.create({
          data: {
            supabaseUserId: user.id,
            email: user.email,
            firstName,
            lastName,
            dateOfBirth: new Date('2000-01-01'), // Default birthday
            password: '', // No password for OAuth users
            isVerified: true,
            avatar: avatar || null
          } as any
        })
      } else {
        return NextResponse.json({ error: 'User not found and no email available' }, { status: 404 })
      }
    }

    const body = await request.json()
    const { name, email, phone, birthday, bio, avatar, stylePreferences, defaultAddress } = body

    // Split name into firstName and lastName
    const nameParts = name?.trim().split(' ') || []
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        dateOfBirth: new Date(birthday),
        bio: bio || null,
        avatar: avatar || null,
        stylePreferences: stylePreferences || [],
        defaultAddress: defaultAddress || null
      } as any
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`,
        email: updatedUser.email,
        phone: updatedUser.phoneNumber,
        birthday: updatedUser.dateOfBirth.toISOString().split('T')[0],
        bio: (updatedUser as any).bio || '',
        avatar: (updatedUser as any).avatar || '',
        stylePreferences: (updatedUser as any).stylePreferences || [],
        defaultAddress: (updatedUser as any).defaultAddress || { shipping: '', billing: '' }
      }
    })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}