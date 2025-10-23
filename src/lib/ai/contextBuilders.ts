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
    console.log('Building order context for userId:', userId);
    
    try {
      // First check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, lastName: true, email: true }
      });
      
      if (!user) {
        console.log('User not found with id:', userId);
        // Try to find by supabaseUserId
        const userBySupabaseId = await prisma.user.findUnique({
          where: { supabaseUserId: userId },
          select: { id: true, firstName: true, lastName: true, email: true }
        });
        
        if (!userBySupabaseId) {
          return 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.';
        }
        
        console.log('Found user by supabaseUserId, using actual userId:', userBySupabaseId.id);
        userId = userBySupabaseId.id;
      }

      console.log('Querying orders for userId:', userId);
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

      console.log('Found orders count:', orders.length);
      
      if (orders.length === 0) {
        return 'Bạn chưa có đơn hàng nào.';
      }

      return this.formatOrderContext(orders)
    } catch (error) {
      console.error('Error building order context:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        userId: userId
      })
      return `Không thể tải thông tin đơn hàng lúc này: ${error instanceof Error ? error.message : 'Unknown error'}`;
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

export class ProductListContextBuilder {
  static async buildProductListContext(limit: number = 10, categories?: string[]): Promise<string> {
    try {
      console.log('Building product list context with limit:', limit, 'categories:', categories);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('status', 'active');
      
      if (categories && categories.length > 0) {
        // For now, we'll use the first category if multiple are provided
        queryParams.append('category', categories[0]);
      }

      // Fetch products from API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products?${queryParams.toString()}`, {
        cache: 'no-store' // Always fetch fresh data
      });

      if (!response.ok) {
        console.error('Failed to fetch products:', response.status, response.statusText);
        return 'Không thể tải danh sách sản phẩm lúc này. Vui lòng thử lại sau.';
      }

      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        return 'Hiện tại không có sản phẩm nào trong danh mục này. Vui lòng chọn danh mục khác hoặc liên hệ hotline để được tư vấn.';
      }

      const products = result.data;
      console.log('Fetched products count:', products.length);

      return this.formatProductListContext(products, categories);
    } catch (error) {
      console.error('Error building product list context:', error);
      return 'Không thể tải danh sách sản phẩm lúc này. Vui lòng thử lại sau.';
    }
  }

  private static formatProductListContext(products: any[], categories?: string[]): string {
    let context = `
🏪 **DANH SÁCH SẢN PHẨM AIFShop** ${categories ? `(Danh mục: ${categories[0]})` : '(Tất cả sản phẩm)'}

Hiện tại shop đang có ${products.length} sản phẩm đẹp. Dưới đây là danh sách chi tiết:

`;

    products.forEach((product: any, index: number) => {
      const price = product.price ? `${product.price.toLocaleString('vi-VN')}₫` : 'Liên hệ';
      const discount = product.compareAtPrice && product.price
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
        : 0;
      
      context += `
${index + 1}. **${product.name}**
   - Giá: ${price}
   ${product.compareAtPrice ? `- Giá gốc: ${product.compareAtPrice.toLocaleString('vi-VN')}₫` : ''}
   ${discount > 0 ? `- Giảm giá: ${discount}%` : ''}
   - Danh mục: ${product.category}
   ${product.badge ? `- Tags: ${product.badge}` : ''}
   ${product.rating ? `- Rating: ${product.rating.toFixed(1)}/5⭐` : ''}
   - Link: /products/${product.slug}
   ${product.description ? `- Mô tả: ${product.description.substring(0, 100)}...` : ''}
`;

      // Add size information if available
      if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        const availableSizes = product.sizes.filter((size: any) => size.stock > 0);
        if (availableSizes.length > 0) {
          context += `   - Size có sẵn: ${availableSizes.map((size: any) => size.name).join(', ')}\n`;
        }
      }
    });

    context += `
💡 **GỢI Ý:**
- Nhập số thứ tự của sản phẩm để xem chi tiết
- Nhập "tư vấn [tên sản phẩm]" để được tư vấn kỹ hơn
- Nhập "size [tên sản phẩm]" để được tư vấn size phù hợp
- Nhập "giá [tên sản phẩm]" để xem thông tin giá và khuyến mãi

🔗 **ĐIỀU HƯỚNG:**
- Click vào link sản phẩm để xem chi tiết và đặt hàng
- Hoặc nói với tôi tên sản phẩm bạn quan tâm để tôi giúp bạn!

📞 **Hỗ trợ:** Hotline 1900-xxxx (8:00 - 22:00 mỗi ngày)
`;

    return context;
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