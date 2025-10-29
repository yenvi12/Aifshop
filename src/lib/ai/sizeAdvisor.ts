import { prisma } from '@/lib/prisma'

export interface SizeRecommendation {
  recommendedSize: string
  confidence: number
  reasoning: string
  alternativeSizes: string[]
  measurementGuide: string
}

export interface UserMeasurement {
  fingerCircumference?: number // mm
  wristCircumference?: number // mm
  neckCircumference?: number // mm
  height?: number // cm
  weight?: number // kg
}

interface ProductInfo {
  name: string;
  category: string;
  sizes: unknown;
  description: string | null;
}

interface OrderItemInfo {
  product: ProductInfo | null;
  size: string | null;
}

interface UserSizeHistory {
  size: string;
  productName: string;
  orderDate: Date;
}

interface SizeChartItem {
  size: string;
  circumference: number;
}

interface RingSize extends SizeChartItem {
  diameter: number;
}

interface BraceletSize extends SizeChartItem {
  wristRange: string;
}

export class SizeAdvisor {
  // Standard ring size chart (Vietnam/International)
  private static readonly RING_SIZE_CHART = [
    { size: '10', circumference: 39.1, diameter: 12.4 },
    { size: '11', circumference: 40.4, diameter: 12.8 },
    { size: '12', circumference: 41.7, diameter: 13.3 },
    { size: '13', circumference: 43.0, diameter: 13.7 },
    { size: '14', circumference: 44.3, diameter: 14.1 },
    { size: '15', circumference: 45.6, diameter: 14.5 },
    { size: '16', circumference: 46.9, diameter: 14.9 },
    { size: '17', circumference: 48.2, diameter: 15.3 },
    { size: '18', circumference: 49.5, diameter: 15.7 },
    { size: '19', circumference: 50.8, diameter: 16.1 },
    { size: '20', circumference: 52.1, diameter: 16.5 },
    { size: '21', circumference: 53.4, diameter: 16.9 },
    { size: '22', circumference: 54.7, diameter: 17.3 },
    { size: '23', circumference: 56.0, diameter: 17.7 },
    { size: '24', circumference: 57.3, diameter: 18.1 },
    { size: '25', circumference: 58.6, diameter: 18.5 },
    { size: '26', circumference: 59.9, diameter: 18.9 },
    { size: '27', circumference: 61.2, diameter: 19.3 },
    { size: '28', circumference: 62.5, diameter: 19.7 },
  ]

  // Standard bracelet sizes
  private static readonly BRACELET_SIZE_CHART = [
    { size: 'S', circumference: 150, wristRange: '14-15cm' },
    { size: 'M', circumference: 170, wristRange: '16-17cm' },
    { size: 'L', circumference: 190, wristRange: '18-19cm' },
    { size: 'XL', circumference: 210, wristRange: '20-21cm' },
  ]

  // Standard necklace lengths
  private static readonly NECKLACE_SIZE_CHART = [
    { length: '35cm', style: 'Choker', description: 'Vừa sát cổ' },
    { length: '40cm', style: 'Classic', description: 'Ngang xương quai xanh' },
    { length: '45cm', style: 'Princess', description: 'Dưới xương quai xanh' },
    { length: '55cm', style: 'Matinee', description: 'Ngang ngực' },
    { length: '60cm', style: 'Opera', description: 'Dưới ngực' },
    { length: '80cm', style: 'Rope', description: 'Có thể quắn nhiều vòng' },
  ]

  static async recommendRingSize(
    productId: string, 
    userId: string, 
    measurements?: UserMeasurement
  ): Promise<SizeRecommendation> {
    try {
      // Get user's purchase history for ring sizes
      const userHistory = await this.getUserRingHistory(userId)
      
      // Get product information
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          name: true,
          category: true,
          sizes: true,
          description: true
        }
      }) as ProductInfo | null

      if (!product) {
        throw new Error('Product not found')
      }

      // Determine best approach for size recommendation
      if (measurements?.fingerCircumference) {
        return this.recommendByMeasurement(measurements.fingerCircumference, 'ring')
      } else if (userHistory.length > 0) {
        return this.recommendByHistory(userHistory, product)
      } else {
        return this.recommendByGeneralInfo(product, measurements)
      }
    } catch (error) {
      console.error('Error recommending ring size:', error)
      return this.getDefaultRecommendation('ring')
    }
  }

  static async recommendBraceletSize(
    productId: string, 
    userId: string, 
    measurements?: UserMeasurement
  ): Promise<SizeRecommendation> {
    try {
      const userHistory = await this.getUserBraceletHistory(userId)
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true, category: true, sizes: true, description: true }
      }) as ProductInfo | null

      if (!product) {
        throw new Error('Product not found')
      }

      if (measurements?.wristCircumference) {
        return this.recommendByMeasurement(measurements.wristCircumference, 'bracelet')
      } else if (userHistory.length > 0) {
        return this.recommendByHistory(userHistory, product)
      } else {
        return this.recommendByGeneralInfo(product, measurements)
      }
    } catch (error) {
      console.error('Error recommending bracelet size:', error)
      return this.getDefaultRecommendation('bracelet')
    }
  }

  private static async getUserRingHistory(userId: string): Promise<UserSizeHistory[]> {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        }
      })

      const ringItems: UserSizeHistory[] = orders.flatMap(order =>
        order.orderItems
          .filter((item: OrderItemInfo) =>
            item.product &&
            item.size &&
            item.product.category.toLowerCase().includes('nhẫn')
          )
          .map((item: OrderItemInfo): UserSizeHistory => ({
            size: item.size!,
            productName: item.product!.name,
            orderDate: order.createdAt
          }))
      )

      return ringItems
    } catch (error) {
      console.error('Error getting user ring history:', error)
      return []
    }
  }

  private static async getUserBraceletHistory(userId: string): Promise<UserSizeHistory[]> {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        }
      })

      const braceletItems: UserSizeHistory[] = orders.flatMap(order =>
        order.orderItems
          .filter((item: OrderItemInfo) =>
            item.product &&
            item.size &&
            item.product.category.toLowerCase().includes('vòng')
          )
          .map((item: OrderItemInfo): UserSizeHistory => ({
            size: item.size!,
            productName: item.product!.name,
            orderDate: order.createdAt
          }))
      )

      return braceletItems
    } catch (error) {
      console.error('Error getting user bracelet history:', error)
      return []
    }
  }

  private static recommendByMeasurement(measurement: number, type: 'ring' | 'bracelet'): SizeRecommendation {
    const chart = type === 'ring' ? this.RING_SIZE_CHART : this.BRACELET_SIZE_CHART
    
    // Find the closest size
    let closestSize = chart[0]
    let minDiff = Math.abs(measurement - (type === 'ring' ? closestSize.circumference : closestSize.circumference))
    
    for (const size of chart) {
      const diff = Math.abs(measurement - size.circumference)
      if (diff < minDiff) {
        minDiff = diff
        closestSize = size
      }
    }

    const confidence = minDiff < 2 ? 0.9 : minDiff < 5 ? 0.7 : 0.5

    return {
      recommendedSize: closestSize.size,
      confidence,
      reasoning: `Dựa trên số đo ${measurement}mm, size ${closestSize.size} phù hợp nhất với bạn.`,
      alternativeSizes: this.getAlternativeSizes(closestSize.size, chart),
      measurementGuide: this.getMeasurementGuide(type)
    }
  }

  private static recommendByHistory(history: UserSizeHistory[], product: ProductInfo): SizeRecommendation {
    // Find most frequently purchased size
    const sizeFrequency: Record<string, number> = {}
    history.forEach(item => {
      sizeFrequency[item.size] = (sizeFrequency[item.size] || 0) + 1
    })

    const mostCommonSize = Object.entries(sizeFrequency)
      .sort(([,a], [,b]) => b - a)[0][0]

    return {
      recommendedSize: mostCommonSize,
      confidence: 0.8,
      reasoning: `Dựa trên lịch sử mua hàng, bạn thường chọn size ${mostCommonSize}.`,
      alternativeSizes: this.getAlternativeSizes(mostCommonSize, this.RING_SIZE_CHART),
      measurementGuide: this.getMeasurementGuide('ring')
    }
  }

  private static recommendByGeneralInfo(product: ProductInfo, measurements?: UserMeasurement): SizeRecommendation {
    // Use height/weight to estimate size
    let estimatedSize = '17' // default ring size
    let reasoning = 'Đây là size phổ biến nhất phù hợp với đa số người dùng.'

    if (measurements?.height && measurements?.weight) {
      const bmi = measurements.weight / ((measurements.height / 100) ** 2)
      
      if (bmi < 18.5) {
        estimatedSize = '16'
        reasoning = 'Dựa trên chỉ số BMI, bạn có thể phù hợp với size nhỏ hơn trung bình.'
      } else if (bmi > 25) {
        estimatedSize = '18'
        reasoning = 'Dựa trên chỉ số BMI, bạn có thể cần size lớn hơn trung bình.'
      }
    }

    return {
      recommendedSize: estimatedSize,
      confidence: 0.6,
      reasoning,
      alternativeSizes: this.getAlternativeSizes(estimatedSize, this.RING_SIZE_CHART),
      measurementGuide: this.getMeasurementGuide('ring')
    }
  }

  private static getDefaultRecommendation(type: 'ring' | 'bracelet'): SizeRecommendation {
    const defaultSize = type === 'ring' ? '17' : 'M'
    
    return {
      recommendedSize: defaultSize,
      confidence: 0.4,
      reasoning: 'Đây là size phổ biến nhất. Để có tư vấn chính xác hơn, vui lòng cung cấp số đo.',
      alternativeSizes: type === 'ring' ? ['16', '18'] : ['S', 'L'],
      measurementGuide: this.getMeasurementGuide(type)
    }
  }

  private static getAlternativeSizes(currentSize: string, chart: SizeChartItem[]): string[] {
    const currentIndex = chart.findIndex(size => size.size === currentSize)
    const alternatives: string[] = []
    
    if (currentIndex > 0) alternatives.push(chart[currentIndex - 1].size)
    if (currentIndex < chart.length - 1) alternatives.push(chart[currentIndex + 1].size)
    
    return alternatives
  }

  private static getMeasurementGuide(type: 'ring' | 'bracelet'): string {
    if (type === 'ring') {
      return `
📏 **HƯỚNG DẪN ĐO SIZE NHẪN:**
1. **Dùng chỉ và thước:** Quấn chỉ quanh ngón tay, đánh dấu điểm giao nhau, đo độ dài.
2. **Dùng giấy:** Cắt một dải giấy 1cm, quấn quanh ngón tay, đánh dấu và đo.
3. **Thời điểm đo tốt nhất:** Buổi chiều hoặc sau khi tập thể thao (ngón tay nở nhất).
4. **Lưu ý:** Đo nhiều lần để đảm bảo chính xác.

📐 **BẢNG SIZE CHUẨN:**
- Size 16: 49.5mm (ngón nhỏ)
- Size 17: 52.1mm (phổ biến nhất)
- Size 18: 54.7mm (ngón trung bình)
- Size 19: 57.3mm (ngón lớn)
`
    } else {
      return `
📏 **HƯỚNG DẪN ĐO SIZE VÒNG TAY:**
1. **Dùng thước:** Đo trực tiếp quanh cổ tay.
2. **Dùng chỉ:** Quấn chỉ quanh cổ tay, đánh dấu và đo độ dài.
3. **Lưu ý:** Chọn size lớn hơn 1-2cm để đeo thoải mái.

📐 **BẢNG SIZE CHUẨN:**
- Size S: 14-15cm (cổ tay nhỏ)
- Size M: 16-17cm (phổ biến nhất)
- Size L: 18-19cm (cổ tay lớn)
- Size XL: 20-21cm (cổ tay rất lớn)
`
    }
  }

  static getNecklaceGuide(): string {
    return `
📏 **HƯỚNG DẪN CHỌN ĐỘ DÀI DÂY CHUYỀN:**
- **35cm (Choker):** Vừa sát cổ, phù hợp với váy cổ tròn
- **40cm (Classic):** Ngang xương quai xanh, phù hợp mọi trang phục
- **45cm (Princess):** Dưới xương quai xanh, phổ biến nhất
- **55cm (Matinee):** Ngang ngực, phù hợp với công sở
- **60cm (Opera):** Dưới ngực, có thể đeo 2 vòng
- **80cm (Rope):** Dài, có thể quấn nhiều kiểu

💡 **LỜI KHUYÊN:**
- Người cổ ngắn nên chọn dây chuyền 40-45cm
- Người cổ dài có thể chọn dây chuyền 50-60cm
- Có thể kết hợp nhiều dây chuyền với độ dài khác nhau
`
  }
}