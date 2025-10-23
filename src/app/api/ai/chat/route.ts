import { NextRequest, NextResponse } from 'next/server';
import { isTokenExpired } from '@/lib/tokenManager';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IntentRecognizer, Intent } from '@/lib/ai/intentRecognizer';
import { ProductContextBuilder, OrderContextBuilder, GeneralContextBuilder } from '@/lib/ai/contextBuilders';
import { SizeAdvisor } from '@/lib/ai/sizeAdvisor';
import jwt from 'jsonwebtoken';

// Google AI Studio API configuration
const MODEL_NAME = 'gemini-2.5-flash';
const API_TIMEOUT = 60000; // 60 seconds

// System prompt cho AI chuyên tư vấn trang sức
const SYSTEM_PROMPT = `Bạn là chuyên gia tư vấn trang sức cao cấp cho AIFShop - cửa hàng trang sức và thời trang uy tín tại Việt Nam. Với kinh nghiệm sâu rộng về các loại trang sức, xu hướng thời trang và kiến thức gemstone, bạn sẽ giúp khách hàng:

🔹 **Sản phẩm & Tư vấn:**
- Nhẫn kim cương, nhẫn vàng, nhẫn bạc
- Dây chuyền, vòng cổ, bông tai
- Vòng tay, lắc tay phong thủy
- Trang sức cưới, quà tặng

🔹 **Chuyên môn của bạn:**
- Tư vấn size nhẫn phù hợp (size VN, quốc tế)
- Gợi ý trang sức theo dáng người, da màu
- Kiến thức về kim loại (vàng 18K, 14K, bạc 925)
- Thông tin đá quý và phong thủy
- Xu hướng trang sức theo mùa, theo dịp

🔹 **Dịch vụ khách hàng:**
- Giúp tìm sản phẩm phù hợp ngân sách
- Tư vấn trang sức cho các dịp đặc biệt
- Hướng dẫn bảo quản trang sức
- Thông tin về chính sách bảo hành, đổi trả

🔹 **Phong cách giao tiếp:**
- Thân thiện, chuyên nghiệp, tinh tế
- Luôn đặt lợi ích khách hàng lên hàng đầu
- Cung cấp thông tin chính xác, hữu ích
- Gợi ý sản phẩm thực tế có sẵn tại AIFShop

🔹 **QUAN TRỌNG - HƯỚNG DẪN TƯ VẤN:**
- **PHẢI** dựa vào THÔNG TIN SẢN PHẨM được cung cấp bên dưới để trả lời
- **KHÔNG** trả lời dựa trên kiến thức chung khi có thông tin sản phẩm cụ thể
- **LUÔN LUÔN** tham khảo size, mô tả, giá cả từ thông tin sản phẩm thực tế
- **ƯU TIÊN** thông tin từ database hơn kiến thức chung
- Nếu thông tin sản phẩm không đầy đủ, hãy hỏi thêm để tư vấn chính xác

Hãy trả lời ngắn gọn, dễ hiểu và luôn hướng đến giải quyết vấn đề của khách hàng. Khi cần, hãy hỏi thêm thông tin để tư vấn chính xác nhất.`;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login to use AI chat' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      return NextResponse.json(
        { error: 'Session expired - Please login again' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { message, conversationHistory = [], productId, context, productCategory } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Get Google AI API key from environment
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('Google AI API key not configured');
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Initialize Google AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Recognize user intent
    const intent: Intent = IntentRecognizer.recognizeIntent(message);
    console.log('Recognized intent:', intent);
    console.log('Received productId:', productId);

    // Build context based on intent
    let contextData = '';
    
    if (productId && (intent.type === 'PRODUCT_ADVICE' || intent.type === 'SIZE_RECOMMENDATION' || intent.type === 'PRICE_INQUIRY')) {
      // Product-specific context
      console.log('Building product context for productId:', productId);
      contextData = await ProductContextBuilder.buildContext(productId);
      console.log('Product context built successfully, length:', contextData.length);
      
      // Add size recommendation if specifically asked
      if (intent.type === 'SIZE_RECOMMENDATION') {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
          const userId = decoded.userId || decoded.supabaseUserId;
          
          let recommendation;
          if (productCategory?.toLowerCase().includes('nhẫn')) {
            recommendation = await SizeAdvisor.recommendRingSize(productId, userId);
          } else if (productCategory?.toLowerCase().includes('vòng')) {
            recommendation = await SizeAdvisor.recommendBraceletSize(productId, userId);
          }
          
          if (recommendation) {
            contextData += `\n\n📏 **TƯ VẤN SIZE TỰ ĐỘNG:**\n${recommendation.reasoning}\nSize đề xuất: ${recommendation.recommendedSize}\n${recommendation.measurementGuide}`;
          }
        } catch (error) {
          console.error('Error getting size recommendation:', error);
        }
      }
    } else if (intent.type === 'ORDER_STATUS') {
      // Order context - need user ID from token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      const userId = decoded.userId || decoded.supabaseUserId;
      contextData = await OrderContextBuilder.buildOrderContext(userId);
    } else {
      // General context
      contextData = GeneralContextBuilder.buildGeneralContext();
    }

    // Prepare conversation history for Google AI
    const conversationHistoryText = conversationHistory.slice(-10).map((msg: any) =>
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    // Create enhanced prompt with context - Ưu tiên contextData đã build từ database
    const contextPrompt = contextData || context || '';
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextPrompt ? `📋 **THÔNG TIN SẢN PHẨM CẦN TƯ VẤN:**\n${contextPrompt}\n\n` : ''}${conversationHistoryText}\n\nUser: ${message}\nAssistant:`;

    console.log('Calling Google AI API with prompt length:', fullPrompt.length);
    console.log('Context Data Length:', contextData.length);
    console.log('Full Prompt Preview:', fullPrompt.substring(0, 500) + '...');

    // Call Google AI API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    let aiResponse: string;
    try {
      const result = await Promise.race([
        model.generateContent(fullPrompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('API timeout')), API_TIMEOUT)
        )
      ] as const);

      clearTimeout(timeoutId);
      
      if (!(result as any).response) {
        throw new Error('No response from Google AI');
      }

      aiResponse = (result as any).response.text();
      console.log('Google AI response received, length:', aiResponse.length);
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
    
    // Check if AI response is empty or null
    if (!aiResponse || aiResponse.trim() === '') {
      console.error('AI response is empty:', aiResponse);
      return NextResponse.json(
        { error: 'AI service returned empty response' },
        { status: 503 }
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      response: aiResponse,
      usage: null, // Google AI doesn't provide usage info in free tier
      model: MODEL_NAME,
      usedFallback: false
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Unable to process your request at this time'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
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