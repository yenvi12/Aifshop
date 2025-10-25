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

// System prompt for AI (giữ nguyên nội dung dài của bạn)
const SYSTEM_PROMPT = `...`; // Rút gọn cho ngắn ở đây

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
    // 🛍️ Order status
    else if (intent.type === 'ORDER_STATUS') {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback-secret'
      ) as DecodedToken;
      const userId: string | undefined =
        decoded.userId || decoded.supabaseUserId;

      if (!userId) {
        contextData =
          'Không thể xác định người dùng để truy cập thông tin đơn hàng.';
      } else {
        contextData = await OrderContextBuilder.buildOrderContext(userId);
      }
    }
    // 🛒 Product listing
    else if (intent.type === 'PRODUCT_LISTING') {
      const limit = intent.entities.limit || 10;
      const categories = intent.entities.categories;
      contextData = await ProductListContextBuilder.buildProductListContext(limit, categories);
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
      contextPrompt ? `📋 **THÔNG TIN SẢN PHẨM CẦN TƯ VẤN:**\n${contextPrompt}\n\n` : ''
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
