import { prisma } from '@/lib/prisma'

export interface ProductContext {
  id: string
  name: string
  price: number | null
  compareAtPrice: number | null
  description: string | null
  category: string
  images: string[]
  sizes: any[]
  rating: number | null
  stock: number
  badge: string | null
  reviews: any[]
  relatedProducts: any[]
}

export interface OrderContext {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  trackingNumber: string | null
  estimatedDelivery: Date | null
  orderItems: any[]
  shippingAddress: any
  createdAt: Date
}

export class ProductContextBuilder {
  static async buildContext(productId: string): Promise<string> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId, isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          compareAtPrice: true,
          description: true,
          category: true,
          image: true,
          images: true,
          sizes: true,
          rating: true,
          stock: true,
          badge: true,
          reviews: {
            where: { isActive: true },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          _count: {
            select: { reviews: true }
          }
        }
      })

      if (!product) {
        return 'Sản phẩm không tìm thấy hoặc đã ngưng kinh doanh.'
      }

      console.log('Product data retrieved:', {
        id: product.id,
        name: product.name,
        hasDescription: !!product.description,
        descriptionLength: product.description?.length || 0,
        hasSizes: !!product.sizes,
        sizesCount: Array.isArray(product.sizes) ? product.sizes.length : 0,
        sizes: product.sizes
      });

      const relatedProducts = await this.getRelatedProducts(product.category, product.id)
      
      return this.formatProductContext(product, relatedProducts)
    } catch (error) {
      console.error('Error building product context:', error)
      return 'Không thể tải thông tin sản phẩm lúc này.'
    }
  }

  private static async getRelatedProducts(category: string, currentProductId: string): Promise<any[]> {
    try {
      const relatedProducts = await prisma.product.findMany({
        where: {
          category,
          isActive: true,
          id: { not: currentProductId }
        },
        take: 3,
        select: {
          id: true,
          name: true,
          price: true,
          compareAtPrice: true,
          image: true,
          rating: true,
          badge: true,
          slug: true
        },
        orderBy: { rating: 'desc' }
      })

      return relatedProducts
    } catch (error) {
      console.error('Error fetching related products:', error)
      return []
    }
  }

  private static formatProductContext(product: any, relatedProducts: any[]): string {
    const discount = product.compareAtPrice && product.price 
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0

    let context = `
📦 **THÔNG TIN SẢN PHẨM HIỆN TẠI:**
- Tên: ${product.name}
- Giá: ${product.price ? `${product.price.toLocaleString('vi-VN')}₫` : 'Liên hệ'}
${product.compareAtPrice ? `- Giá gốc: ${product.compareAtPrice.toLocaleString('vi-VN')}₫` : ''}
${discount > 0 ? `- Giảm giá: ${discount}%` : ''}
- Danh mục: ${product.category}
- Tồn kho: ${product.stock} sản phẩm
${product.badge ? `- Tags: ${product.badge}` : ''}

📝 **MÔ TẢ SẢN PHẨM:**
${product.description || 'Không có mô tả chi tiết.'}

📏 **THÔNG TIN SIZE:**
${this.formatSizes(product.sizes)}

⭐ **ĐÁNH GIÁ:**
- Rating: ${product.rating?.toFixed(1) || 'Chưa có đánh giá'}/5
- Số lượng đánh giá: ${product._count?.reviews || 0}

📷 **HÌNH ẢNH:**
Sản phẩm có ${product.images?.length || 0} hình ảnh chi tiết.
`

    if (product.reviews && product.reviews.length > 0) {
      context += `
💬 **ĐÁNH GIÁ GẦN ĐÂY:**
${this.formatRecentReviews(product.reviews)}
`
    }

    if (relatedProducts.length > 0) {
      context += `
🔗 **SẢN PHẨM LIÊN QUAN:**
${this.formatRelatedProducts(relatedProducts)}
`
    }

    return context
  }

  private static formatSizes(sizes: any[]): string {
    if (!sizes || sizes.length === 0) {
      return '- Không có thông tin size cụ thể'
    }

    return sizes.map((size: any) => {
      const status = size.stock > 0 
        ? `Còn ${size.stock} sản phẩm` 
        : 'Hết hàng'
      return `- Size ${size.name}: ${status}`
    }).join('\n')
  }

  private static formatRecentReviews(reviews: any[]): string {
    return reviews.slice(0, 3).map((review: any) => {
      const userName = `${review.user.firstName} ${review.user.lastName}`
      const rating = '⭐'.repeat(review.rating)
      return `- ${userName} (${rating}): "${review.comment}"`
    }).join('\n')
  }

  private static formatRelatedProducts(relatedProducts: any[]): string {
    return relatedProducts.map((product: any, index: number) => {
      const price = product.price ? `${product.price.toLocaleString('vi-VN')}₫` : 'Liên hệ'
      const rating = product.rating ? `${product.rating.toFixed(1)}/5` : 'Chưa có đánh giá'
      return `${index + 1}. ${product.name} - ${price} (Rating: ${rating})`
    }).join('\n')
  }
}

export class OrderContextBuilder {
  static async buildOrderContext(userId: string): Promise<string> {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  image: true,
                  slug: true
                }
              }
            }
          },
          payment: true
        }
      })

      if (orders.length === 0) {
        return 'Bạn chưa có đơn hàng nào.'
      }

      return this.formatOrderContext(orders)
    } catch (error) {
      console.error('Error building order context:', error)
      return 'Không thể tải thông tin đơn hàng lúc này.'
    }
  }

  private static formatOrderContext(orders: any[]): string {
    let context = `
📋 **THÔNG TIN ĐƠN HÀNG CỦA BẠN:**

`

    orders.forEach((order: any, index: number) => {
      const statusEmoji = this.getStatusEmoji(order.status)
      const statusText = this.getStatusText(order.status)
      
      context += `
${index + 1}. **Đơn hàng #${order.orderNumber}**
   - Trạng thái: ${statusEmoji} ${statusText}
   - Tổng tiền: ${order.totalAmount.toLocaleString('vi-VN')}₫
   - Ngày đặt: ${order.createdAt.toLocaleDateString('vi-VN')}
   ${order.trackingNumber ? `- Mã vận chuyển: ${order.trackingNumber}` : ''}
   ${order.estimatedDelivery ? `- Dự kiến giao: ${order.estimatedDelivery.toLocaleDateString('vi-VN')}` : ''}
   
   **Sản phẩm trong đơn:**
   ${order.orderItems.map((item: any) => 
     `• ${item.product.name} ${item.size ? `(Size ${item.size})` : ''} - SL: ${item.quantity}`
   ).join('\n   ')}
`
    })

    return context
  }

  private static getStatusEmoji(status: string): string {
    const statusMap: Record<string, string> = {
      'ORDERED': '📝',
      'CONFIRMED': '✅',
      'PROCESSING': '⚙️',
      'SHIPPED': '🚚',
      'DELIVERED': '✨',
      'CANCELLED': '❌'
    }
    return statusMap[status] || '📝'
  }

  private static getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'ORDERED': 'Đã đặt hàng',
      'CONFIRMED': 'Đã xác nhận',
      'PROCESSING': 'Đang xử lý',
      'SHIPPED': 'Đang giao hàng',
      'DELIVERED': 'Đã giao hàng',
      'CANCELLED': 'Đã hủy'
    }
    return statusMap[status] || status
  }
}

export class GeneralContextBuilder {
  static buildGeneralContext(): string {
    return `
🏪 **THÔNG TIN CỬA HÀNG AIFShop:**
- Chuyên kinh doanh trang sức cao cấp: nhẫn, dây chuyền, bông tai, vòng tay
- Chất liệu: vàng 18K, 14K, bạc 925, kim cương, đá quý
- Dịch vụ: tư vấn size, bảo hành, đổi trả, miễn phí vận chuyển
- Hotline hỗ trợ: 1900-xxxx
- Giờ mở cửa: 8:00 - 22:00 mỗi ngày

💡 **GỢI Ý TƯ VẤN:**
- Tư vấn size nhẫn dựa trên số đo vòng ngón
- Gợi ý trang sức phù hợp với dáng người và phong cách
- Tư vấn trang sức theo dịp đặc biệt (cưới, lễ, sinh nhật)
- Hướng dẫn bảo quản trang sức đúng cách
- Thông tin về chính sách bảo hành và đổi trả
`
  }
}