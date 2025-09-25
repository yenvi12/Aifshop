import nodemailer from 'nodemailer'

// Cấu hình email transporter (có thể dùng SendGrid, Gmail, etc.)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
})

// Template HTML cho OTP email
function getOTPEmailTemplate(otp: string, expiryMinutes: number = 10): string {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác thực email - AIFShop</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; margin: 20px 0; letter-spacing: 5px; }
        .warning { color: #ff6b6b; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>AIFShop</h1>
        <p>AI-Powered Fashion Shopping</p>
      </div>

      <div class="content">
        <h2>Xác thực email của bạn</h2>
        <p>Chào bạn!</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại AIFShop. Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã OTP bên dưới:</p>

        <div class="otp-code">${otp}</div>

        <p><strong class="warning">Lưu ý:</strong> Mã OTP này sẽ hết hạn trong <strong>${expiryMinutes} phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>

        <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>

        <p>Trân trọng,<br>Đội ngũ AIFShop</p>
      </div>

      <div class="footer">
        <p>Email này được gửi tự động. Vui lòng không trả lời.</p>
        <p>&copy; 2024 AIFShop. Tất cả quyền được bảo lưu.</p>
      </div>
    </body>
    </html>
  `
}

// Template HTML cho welcome email
function getWelcomeEmailTemplate(firstName: string, lastName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Chào mừng đến với AIFShop</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .welcome { font-size: 24px; color: #4CAF50; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>AIFShop</h1>
        <p>AI-Powered Fashion Shopping</p>
      </div>

      <div class="content">
        <div class="welcome">Chào mừng ${firstName} ${lastName}!</div>

        <p>Chúc mừng! Tài khoản của bạn đã được tạo thành công tại AIFShop.</p>

        <p>Bây giờ bạn có thể:</p>
        <ul>
          <li>Khám phá các mẫu thời trang được cá nhân hóa bởi AI</li>
          <li>Mua sắm các sản phẩm thời trang chất lượng cao</li>
          <li>Nhận các ưu đãi đặc biệt và khuyến mãi</li>
          <li>Theo dõi xu hướng thời trang mới nhất</li>
        </ul>

        <p>Hãy bắt đầu hành trình mua sắm của bạn ngay hôm nay!</p>

        <p>Trân trọng,<br>Đội ngũ AIFShop</p>
      </div>

      <div class="footer">
        <p>Email này được gửi tự động. Vui lòng không trả lời.</p>
        <p>&copy; 2024 AIFShop. Tất cả quyền được bảo lưu.</p>
      </div>
    </body>
    </html>
  `
}

// Gửi OTP email với retry mechanism
export async function sendOTPEmail(email: string, otp: string, retryCount: number = 3): Promise<boolean> {
  // SMTP must be configured for sending emails
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('SMTP not configured - cannot send OTP email')
    return false // Return false to block registration
  }

  const mailOptions = {
    from: `"AIFShop" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Mã xác thực email - AIFShop',
    html: getOTPEmailTemplate(otp)
  }

  console.log(`Attempting to send OTP email to ${email} with SMTP config:`, {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER ? 'configured' : 'missing',
    pass: process.env.SMTP_PASS ? 'configured' : 'missing'
  })

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions)
      console.log(`✅ OTP email sent successfully to ${email}: ${info.messageId}`)
      return true
    } catch (error: any) {
      console.error(`❌ Attempt ${attempt} failed to send OTP email to ${email}:`, {
        message: error.message,
        code: error.code,
        response: error.response
      })

      if (attempt === retryCount) {
        console.error(`❌ Failed to send OTP email to ${email} after ${retryCount} attempts`)
        return false
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  return false
}

// Gửi welcome email
export async function sendWelcomeEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  const mailOptions = {
    from: `"AIFShop" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Chào mừng đến với AIFShop!',
    html: getWelcomeEmailTemplate(firstName, lastName)
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log(`Welcome email sent to ${email}: ${info.messageId}`)
    return true
  } catch (error) {
    console.error(`Failed to send welcome email to ${email}:`, error)
    return false
  }
}