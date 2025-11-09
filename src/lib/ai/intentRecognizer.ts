export interface Intent {
  type: 'PRODUCT_ADVICE' | 'ORDER_STATUS' | 'PRICE_INQUIRY' | 'SIZE_RECOMMENDATION' | 'PRODUCT_LISTING' | 'GENERAL'
  confidence: number
  entities: {
    productId?: string
    orderId?: string
    categories?: string[]
    priceRange?: { min: number; max: number }
    sizeQuery?: boolean
    productType?: string
    limit?: number
  }
}

export class IntentRecognizer {
  private static readonly KEYWORDS = {
    PRODUCT_ADVICE: [
      'tư vấn', 'chọn', 'gợi ý', 'nên', 'phù hợp', 'kết hợp', 'mặc', 'đeo',
      'product', 'sản phẩm', 'trang sức', 'nhẫn', 'dây chuyền', 'bông tai', 'vòng tay'
    ],
    ORDER_STATUS: [
      'đơn hàng', 'order', 'giao hàng', 'vận chuyển', 'tracking', 'đơn của tôi',
      'mua hàng', 'thanh toán', 'đã đặt', 'chờ giao'
    ],
    PRICE_INQUIRY: [
      'giá', 'giá bao nhiêu', 'bao tiền', 'khuyến mãi', 'giảm giá', 'sale',
      'đắt', 'rẻ', 'chi phí', 'cost', 'price'
    ],
    SIZE_RECOMMENDATION: [
      'size', 'kích cỡ', 'đo', 'vòng tay', 'vòng ngón', 'size nhẫn',
      'fit', 'just right', 'too small', 'too big'
    ],
    PRODUCT_LISTING: [
      'liệt kê', 'danh sách', 'tất cả sản phẩm', 'show products', 'xem sản phẩm',
      'có những sản phẩm nào', 'sản phẩm đang có', 'shop có gì', 'hiển thị sản phẩm',
      'xem tất cả', 'danh mục sản phẩm', 'tất cả', 'show all', 'list products',
      'xem hàng', 'có gì', 'sản phẩm có sẵn', 'inventory', 'stock',
      'xem thêm sản phẩm', 'xem thêm', 'thêm sản phẩm'
    ]
  }

  static recognizeIntent(message: string): Intent {
    const normalizedMessage = message.toLowerCase().trim()
    
    // Calculate scores for each intent type
    const scores = {
      PRODUCT_ADVICE: this.calculateScore(normalizedMessage, this.KEYWORDS.PRODUCT_ADVICE),
      ORDER_STATUS: this.calculateScore(normalizedMessage, this.KEYWORDS.ORDER_STATUS),
      PRICE_INQUIRY: this.calculateScore(normalizedMessage, this.KEYWORDS.PRICE_INQUIRY),
      SIZE_RECOMMENDATION: this.calculateScore(normalizedMessage, this.KEYWORDS.SIZE_RECOMMENDATION),
      PRODUCT_LISTING: this.calculateScore(normalizedMessage, this.KEYWORDS.PRODUCT_LISTING)
    }

    // Find the intent with highest score
    const maxScore = Math.max(...Object.values(scores))
    const bestIntent = Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore) as Intent['type']
    
    // Extract entities
    const entities = this.extractEntities(normalizedMessage)
    
    // Determine confidence based on score
    const confidence = maxScore > 0 ? Math.min(maxScore / 3, 1) : 0.1
    
    // If confidence is too low, classify as GENERAL
    if (confidence < 0.3) {
      return {
        type: 'GENERAL',
        confidence: 0.5,
        entities
      }
    }

    return {
      type: bestIntent,
      confidence,
      entities
    }
  }

  private static calculateScore(message: string, keywords: string[]): number {
    let score = 0
    keywords.forEach(keyword => {
      if (message.includes(keyword)) {
        // Exact match gets higher score
        score += message.split(keyword).length - 1
      }
    })
    return score
  }

  private static extractEntities(message: string): Intent['entities'] {
    const entities: Intent['entities'] = {}

    // Extract product type
    const productTypes = ['nhẫn', 'dây chuyền', 'vòng tay', 'bông tai', 'khuyên tai', 'day chuyen', 'vong tay', 'nhan']
    for (const type of productTypes) {
      if (message.includes(type)) {
        entities.productType = type
        break
      }
    }

    // Extract size query indicators
    entities.sizeQuery = message.includes('size') || message.includes('kích cỡ') || message.includes('vòng')

    // Extract price range
    const priceMatches = message.match(/(\d+)\s*k|\d+\s*thousand|\d+\s*n|\d+\s*ngàn/gi)
    if (priceMatches) {
      const prices = priceMatches.map(match => {
        const num = parseInt(match.replace(/\D/g, ''))
        return match.includes('k') || match.includes('thousand') || match.includes('n') || match.includes('ngàn') ? num * 1000 : num
      })
      
      if (prices.length > 0) {
        entities.priceRange = {
          min: Math.min(...prices),
          max: Math.max(...prices)
        }
      }
    }

    // Extract limit for product listing
    const limitMatches = message.match(/(\d+)\s*(sản phẩm|items?|products?)/i)
    if (limitMatches) {
      entities.limit = parseInt(limitMatches[1])
    }

    // Extract categories
    const categories = ['vàng', 'bạc', 'kim cương', 'đá quý', 'thiết kế', 'cổ điển', 'hiện đại']
    entities.categories = categories.filter(cat => message.includes(cat))

    return entities
  }
}