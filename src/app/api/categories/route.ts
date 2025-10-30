import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Lấy danh sách categories duy nhất từ database
export async function GET(request: NextRequest) {
  try {
    // Lấy tất cả categories duy nhất từ database
    const categories = await prisma.product.findMany({
      where: {
        isActive: true,
        category: { not: '' }
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    })

    // Extract categories và filter empty strings
    const categoryList = categories
      .map(item => item.category)
      .filter((category): category is string => category !== null && category !== undefined && category.trim() !== '')
      .sort((a, b) => a.localeCompare(b, 'vi'))

    return NextResponse.json({
      success: true,
      data: categoryList
    })
  } catch (error) {
    console.error('GET categories error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}