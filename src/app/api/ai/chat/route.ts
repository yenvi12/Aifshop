import { NextRequest, NextResponse } from 'next/server';
import { isTokenExpired } from '@/lib/tokenManager';

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'z-ai/glm-4.5-air:free';

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
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Get OpenRouter API key from environment
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OpenRouter API key not configured');
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Prepare messages for OpenRouter
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    // Make request to OpenRouter
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'AIFShop AI Assistant'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'AI service authentication failed' },
          { status: 503 }
        );
      }
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'AI service temporarily busy - Please try again' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response from OpenRouter:', data);
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 503 }
      );
    }

    const aiResponse = data.choices[0].message.content;
    
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
      usage: data.usage || null,
      model: MODEL_NAME
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