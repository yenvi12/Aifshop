import { NextRequest, NextResponse } from 'next/server';
import { isTokenExpired } from '@/lib/tokenManager';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IntentRecognizer, Intent } from '@/lib/ai/intentRecognizer';
import {
  ProductContextBuilder,
  OrderContextBuilder,
  GeneralContextBuilder,
  ProductListContextBuilder,
} from '@/lib/ai/contextBuilders';
import { prisma } from '@/lib/prisma';
import { SizeAdvisor } from '@/lib/ai/sizeAdvisor';
import jwt from 'jsonwebtoken';

// Google AI Studio API configuration
const MODEL_NAME = 'gemini-2.5-flash';
const API_TIMEOUT = 60000; // 60 seconds

// ✅ Type definitions
interface DecodedToken {
  userId?: string;
  supabaseUserId?: string;
  role?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// System prompt for AI
// Lưu ý: không giải thích kỹ thuật cho người dùng cuối. Các quy tắc dưới đây chỉ để mô hình format nội dung.
const SYSTEM_PROMPT = `
Bạn là trợ lý mua sắm của AIFShop, trả lời NGẮN GỌN, trực quan, ưu tiên hiển thị sản phẩm đẹp, rõ ràng.
TUYỆT ĐỐI KHÔNG giải thích về token, intent, API, hệ thống nội bộ hay cấu trúc kỹ thuật.

KHI HIỂU Ý ĐỊNH NGƯỜI DÙNG LIÊN QUAN ĐẾN DANH SÁCH SẢN PHẨM (PRODUCT_LISTING) HOẶC CÁC CÂU:
- "Danh sách tất cả sản phẩm", "Cho tôi xem sản phẩm", "Gợi ý vài sản phẩm", "Shop có gì", v.v.
THÌ LUÔN DÙNG FORMAT SAU (NẾU CÓ DỮ LIỆU SẢN PHẨM ĐƯỢC CUNG CẤP TRONG NGỮ CẢNH):

1) Bắt đầu bằng 1 câu giới thiệu rất ngắn (tối đa 1-2 dòng).
2) SAU ĐÓ, CHO MỖI SẢN PHẨM (tối đa 5 sản phẩm):
  Một dòng duy nhất theo cú pháp:
  [product-card:id={id};name={name};slug={slug};image={image};price={price};compareAt={compareAtPrice};rating={rating};reviewCount={reviewCount};badge={badge}]
  - Các trường có thể bỏ trống nếu không có, nhưng phải giữ cấu trúc key=value đúng.
  - id, name, slug, image, price, rating, reviewCount, badge phải lấy từ dữ liệu đã cung cấp, KHÔNG BỊA.
3) NẾU CÒN TRANG TIẾP THEO (hasNext = true):
  Thêm một dòng nút:
  [button:primary:Xem thêm sản phẩm]

QUY TẮC QUAN TRỌNG:
- Không hiển thị dấu #, bullet hoặc giải thích kỹ thuật quanh các dòng [product-card:...] và [button:...].
- Không trả về JSON.
- Không trả về hơn 5 sản phẩm trong một lần trả lời.
- Nếu KHÔNG CÓ sản phẩm phù hợp: trả lời ngắn gọn, gợi ý người dùng lọc lại (theo khoảng giá, danh mục, từ khóa), KHÔNG sinh [product-card:].
- Với các intent khác (tư vấn size, đơn hàng, v.v.), trả lời tự nhiên như trợ lý mua sắm, có thể dùng markdown cơ bản.
`;

export async function POST(request: NextRequest) {
  try {
    // 🧩 Verify authentication token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login to use AI chat' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (isTokenExpired(token)) {
      return NextResponse.json(
        { error: 'Session expired - Please login again' },
        { status: 401 }
      );
    }

    // 🧩 Parse request body
    const body = await request.json();
    const { message, conversationHistory = [], productId, context, productCategory } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // 🧩 Validate Google AI API key
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('Google AI API key not configured');
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }

    // 🧠 Initialize AI model
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // 🎯 Recognize intent
    const intent: Intent = IntentRecognizer.recognizeIntent(message);
    console.log('Recognized intent:', intent);

    let contextData = '';

    // 💎 Build product context (when applicable)
    if (
      productId &&
      ['PRODUCT_ADVICE', 'SIZE_RECOMMENDATION', 'PRICE_INQUIRY'].includes(intent.type)
    ) {
      contextData = await ProductContextBuilder.buildContext(productId);

      if (intent.type === 'SIZE_RECOMMENDATION') {
        try {
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'fallback-secret'
          ) as DecodedToken;
          const userId: string | undefined =
            decoded.userId || decoded.supabaseUserId;

          let recommendation;
          if (userId && productCategory?.toLowerCase().includes('nhẫn')) {
            recommendation = await SizeAdvisor.recommendRingSize(productId, userId);
          } else if (userId && productCategory?.toLowerCase().includes('vòng')) {
            recommendation = await SizeAdvisor.recommendBraceletSize(productId, userId);
          }

          if (recommendation) {
            contextData += `\n\n📏 **TƯ VẤN SIZE TỰ ĐỘNG:**\n${recommendation.reasoning}\nSize đề xuất: ${recommendation.recommendedSize}\n${recommendation.measurementGuide}`;
          }
        } catch (error) {
          console.error('Error getting size recommendation:', error);
        }
      }
    }
    // 🛍️ Order status - trả về danh sách order-card (truy vấn trực tiếp DB, không gọi /api/orders)
    else if (intent.type === 'ORDER_STATUS') {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback-secret'
      ) as DecodedToken;

      let userId: string | undefined = decoded.userId || decoded.supabaseUserId;

      if (!userId) {
        return NextResponse.json({
          success: true,
          response: 'Không thể xác định người dùng để truy cập thông tin đơn hàng. Vui lòng đăng nhập lại.',
          usage: null,
          model: MODEL_NAME,
          usedFallback: false,
        });
      }

      try {
        // Đồng bộ với OrderContextBuilder: nếu userId là supabaseUserId, map sang User.id
        let dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (!dbUser) {
          const bySupabase = await prisma.user.findUnique({
            where: { supabaseUserId: userId },
            select: { id: true },
          });
          if (!bySupabase) {
            return NextResponse.json({
              success: true,
              response: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.',
              usage: null,
              model: MODEL_NAME,
              usedFallback: false,
            });
          }
          dbUser = bySupabase;
          userId = bySupabase.id;
        }

        // Lấy tối đa 5 đơn hàng gần nhất của user từ DB
        const orders = await prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 6, // lấy dư 1 để check hasMore
          include: {
            orderItems: {
              select: {
                quantity: true,
              },
            },
          },
        });

        if (!orders || orders.length === 0) {
          return NextResponse.json({
            success: true,
            response: 'Bạn chưa có đơn hàng nào.',
            usage: null,
            model: MODEL_NAME,
            usedFallback: false,
          });
        }

        const limit = 5;
        const visible = orders.slice(0, limit);

        const lines = visible.map((order) => {
          const id = order.id;
          const code = order.orderNumber || '';
          const status = order.status || '';
          const totalAmount =
            typeof order.totalAmount === 'number' && !Number.isNaN(order.totalAmount)
              ? order.totalAmount
              : 0;
          const createdAt = order.createdAt
            ? new Date(order.createdAt).toISOString()
            : '';
          const itemCount = Array.isArray(order.orderItems)
            ? order.orderItems.reduce(
                (sum, item) => sum + (item.quantity || 0),
                0
              )
            : 0;

          return `[order-card:id=${id};code=${code};status=${status};total=${totalAmount};createdAt=${createdAt};itemCount=${itemCount}]`;
        });

        const hasMore = orders.length > limit;
        const moreButton = hasMore
          ? '\n[button:primary:Xem tất cả đơn hàng]'
          : '';

        return NextResponse.json({
          success: true,
          response: `Dưới đây là một số đơn hàng gần đây của bạn:\n${lines.join(
            '\n'
          )}${moreButton}`,
          usage: null,
          model: MODEL_NAME,
          usedFallback: false,
        });
      } catch (error) {
        console.error('Error fetching orders for ORDER_STATUS intent:', error);
        return NextResponse.json({
          success: true,
          response:
            'Không thể tải lịch sử đơn hàng lúc này. Vui lòng thử lại sau hoặc truy cập trang /orders.',
          usage: null,
          model: MODEL_NAME,
          usedFallback: true,
        });
      }
    }
    // 🛒 Product listing - build trực tiếp danh sách sản phẩm dạng [product-card:...]
    else if (intent.type === 'PRODUCT_LISTING') {
      // Giới hạn UX: tối đa 5 sản phẩm một lần
      const requestedLimit = intent.entities.limit || 5;
      const limit = Math.min(requestedLimit, 5);

      const categories = intent.entities.categories;

      // Đếm số sản phẩm đã hiển thị trong conversation history
      // Để tính toán pagination và tránh trùng lặp
      // Chỉ đếm từ các message gần đây nhất (5 messages cuối) để tránh vấn đề khi đổi category
      let displayedProductCount = 0;
      const productCardRegex = /\[product-card:[^\]]+\]/g;
      
      // Lấy 5 messages cuối cùng (để đếm sản phẩm từ session hiện tại)
      const recentMessages = (conversationHistory as ChatMessage[]).slice(-5);
      
      // Đếm số [product-card:...] trong các message assistant gần đây
      // Chỉ đếm nếu message có chứa [product-card:...] (tức là đã hiển thị sản phẩm)
      recentMessages.forEach((msg) => {
        if (msg.role === 'assistant') {
          const matches = msg.content.match(productCardRegex);
          if (matches) {
            displayedProductCount += matches.length;
          }
        }
      });

      // Tính toán page dựa trên số sản phẩm đã hiển thị
      // Nếu đã hiển thị 5 sản phẩm, page = 2; nếu 10 sản phẩm, page = 3, v.v.
      // Nếu không có sản phẩm nào, bắt đầu từ page 1
      const currentPage = displayedProductCount > 0 ? Math.floor(displayedProductCount / limit) + 1 : 1;

      console.log(`[PRODUCT_LISTING] Displayed products: ${displayedProductCount}, Page: ${currentPage}, Limit: ${limit}`);

      // Gọi trực tiếp API products của hệ thống để lấy dữ liệu thật
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const searchParams = new URLSearchParams();
      searchParams.set('limit', String(limit));
      searchParams.set('page', String(currentPage));
      searchParams.set('status', 'active');

      if (categories && categories.length > 0) {
        // Tạm dùng category đầu tiên nếu có
        searchParams.set('category', categories[0]);
      }

      const productsRes = await fetch(`${baseUrl}/api/products?${searchParams.toString()}`, {
        cache: 'no-store'
      });

      if (!productsRes.ok) {
        console.error('Failed to fetch products for PRODUCT_LISTING intent:', productsRes.status, productsRes.statusText);
        contextData = 'Hiện tại tôi chưa lấy được danh sách sản phẩm. Bạn có thể truy cập trang /shop để xem đầy đủ sản phẩm.';
      } else {
        const productsJson = await productsRes.json();

        if (!productsJson.success || !productsJson.data || productsJson.data.length === 0) {
          // Nếu không còn sản phẩm nào, thông báo cho người dùng
          if (displayedProductCount > 0) {
            contextData = 'Bạn đã xem hết tất cả sản phẩm. Vui lòng thử tìm kiếm với từ khóa khác hoặc truy cập trang /shop để xem đầy đủ.';
          } else {
            contextData = 'Không tìm thấy sản phẩm phù hợp với yêu cầu hiện tại.';
          }
        } else {
          const products = productsJson.data as Array<{
            id: string;
            name: string;
            slug: string;
            image?: string | null;
            price?: number | null;
            compareAtPrice?: number | null;
            rating?: number | null;
            badge?: string | null;
            _count?: { reviews?: number };
          }>;
          const hasNext = Boolean(productsJson.pagination?.hasNext);

          // Build chuỗi các dòng [product-card:...] + nút Xem thêm (nếu có)
          const productLines = products.slice(0, limit).map((p) => {
            // Chuẩn hóa theo rule:
            // - price: luôn là giá cuối cùng hiển thị cho khách
            // - compareAtPrice: giá gốc (gạch ngang) nếu > price
            const rawPrice =
              typeof p.price === 'number' && !Number.isNaN(p.price) && p.price > 0
                ? p.price
                : null;
            const rawCompare =
              typeof p.compareAtPrice === 'number' && !Number.isNaN(p.compareAtPrice) && p.compareAtPrice > 0
                ? p.compareAtPrice
                : null;

            let finalPrice: number | null = null;
            let originalPrice: number | null = null;

            if (rawPrice !== null && rawCompare !== null && rawCompare > rawPrice) {
              // Có giá sale + giá gốc hợp lệ
              finalPrice = rawPrice;
              originalPrice = rawCompare;
            } else if (rawPrice !== null) {
              // Chỉ có 1 giá hợp lệ -> dùng làm giá hiển thị
              finalPrice = rawPrice;
              originalPrice = null;
            } else if (rawCompare !== null) {
              // Chỉ có compareAtPrice hợp lệ -> coi như giá hiển thị (không sale)
              finalPrice = rawCompare;
              originalPrice = null;
            } else {
              // Không có giá hợp lệ -> để trống, UI sẽ xử lý (Liên hệ)
              finalPrice = null;
              originalPrice = null;
            }

            const safeRating =
              typeof p.rating === 'number' && !Number.isNaN(p.rating) && p.rating > 0
                ? p.rating
                : 0;
            const reviewCount =
              (p as any).reviewCount ??
              (p._count && typeof p._count.reviews === 'number' ? p._count.reviews : 0);
            const badge = p.badge || '';

            // Chỉ ghi key=value khi có giá trị, tránh nhét 0 gây hiểu nhầm
            const parts: string[] = [
              `id=${p.id}`,
              `name=${p.name}`,
              `slug=${p.slug}`,
              `image=${p.image || ''}`,
              `price=${finalPrice !== null ? finalPrice : ''}`,
              `compareAt=${originalPrice !== null ? originalPrice : ''}`,
              `rating=${safeRating || ''}`,
              `reviewCount=${reviewCount || ''}`,
              `badge=${badge}`
            ];

            return `[product-card:${parts.join(';')}]`;
          });

          const moreButton = hasNext ? '\n[button:primary:Xem thêm sản phẩm]' : '';

          // Với PRODUCT_LISTING, chúng ta KHÔNG yêu cầu mô hình tự nghĩ cấu trúc,
          // mà cung cấp luôn output cuối cùng theo chuẩn [product-card] + [button].
          // Điều này đảm bảo MessageParser nhận đúng format và frontend render được ButtonRenderer.
          return NextResponse.json({
            success: true,
            response: `Một số sản phẩm phù hợp cho bạn:\n${productLines.join('\n')}${moreButton}`,
            usage: null,
            model: MODEL_NAME,
            usedFallback: false,
          });
        }
      }
    }
    // 🤝 General question
    else {
      contextData = GeneralContextBuilder.buildGeneralContext();
    }

    // 🗨️ Build chat history (type-safe)
    const conversationHistoryText = (conversationHistory as ChatMessage[])
      .slice(-10)
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // 🧩 Combine prompts
    const contextPrompt = contextData || context || '';
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${
      contextPrompt
        ? `DỮ LIỆU/BỐI CẢNH (KHÔNG GIẢI THÍCH RA NGOÀI, CHỈ DÙNG ĐỂ TẠO CÂU TRẢ LỜI):\n${contextPrompt}\n\n`
        : ''
    }${conversationHistoryText}\n\nUser: ${message}\nAssistant:`;

    // ⚡ Call AI with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    let aiResponse: string;
    try {
      const result = await Promise.race([
        model.generateContent(fullPrompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('API timeout')), API_TIMEOUT)
        ),
      ] as const);

      clearTimeout(timeoutId);

      if (!(result as { response?: { text(): string } }).response) {
        throw new Error('No response from Google AI');
      }

      aiResponse = (result as { response: { text(): string } }).response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Google AI API call failed:', error);

      if (error instanceof Error && error.message === 'API timeout') {
        return NextResponse.json(
          { error: 'AI service temporarily busy - Please try again' },
          { status: 429 }
        );
      }
      throw error;
    }

    // 🚫 Empty response check
    if (!aiResponse || aiResponse.trim() === '') {
      return NextResponse.json(
        { error: 'AI service returned empty response' },
        { status: 503 }
      );
    }

    // ✅ Success
    return NextResponse.json({
      success: true,
      response: aiResponse,
      usage: null,
      model: MODEL_NAME,
      usedFallback: false,
    });
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Unable to process your request at this time',
      },
      { status: 500 }
    );
  }
}

// ✅ CORS handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
