import { z } from 'zod'

// Email validation theo RFC 5322 (sử dụng regex đơn giản)
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// Phone validation cho Việt Nam và quốc tế
const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/

export const registerSchema = z.object({
  firstName: z.string()
    .min(1, 'First name không được rỗng')
    .max(50, 'First name quá dài')
    .regex(/^[a-zA-Z\s]+$/, 'First name chỉ chứa chữ cái'),

  lastName: z.string()
    .min(1, 'Last name không được rỗng')
    .max(50, 'Last name quá dài')
    .regex(/^[a-zA-Z\s]+$/, 'Last name chỉ chứa chữ cái'),

  email: z.string()
    .regex(emailRegex, 'Email không hợp lệ'),

  phoneNumber: z.string()
    .optional()
    .refine((val) => !val || val.trim() === '' || phoneRegex.test(val), 'Số điện thoại không hợp lệ'),

  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải có định dạng YYYY-MM-DD')
    .refine((dateStr) => {
      const date = new Date(dateStr)
      const now = new Date()
      const age = now.getFullYear() - date.getFullYear()
      return age >= 18
    }, 'Bạn phải từ 18 tuổi trở lên'),

  password: z.string()
    .min(8, 'Mật khẩu phải ít nhất 8 ký tự')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'),

  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword']
})

export const loginSchema = z.object({
  email: z.string().regex(emailRegex, 'Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được rỗng')
})

export const otpVerificationSchema = z.object({
  transactionId: z.string().uuid('Transaction ID không hợp lệ'),
  otp: z.string().length(6, 'OTP phải có 6 chữ số').regex(/^\d{6}$/, 'OTP chỉ chứa số')
})

export const createProductSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được rỗng').max(100, 'Tên sản phẩm quá dài'),
  description: z.string().optional(),
  price: z.number().min(0, 'Giá phải lớn hơn hoặc bằng 0'),
  compareAtPrice: z.number().min(0, 'Giá gốc phải lớn hơn hoặc bằng 0').optional(),
  category: z.string().min(1, 'Danh mục không được rỗng'),
  image: z.string().url('Ảnh chính phải là URL hợp lệ').nullable().optional(),
  images: z.array(z.string().url('Ảnh phải là URL hợp lệ')).default([]),
  stock: z.number().int().min(0, 'Số lượng tồn kho phải lớn hơn hoặc bằng 0').default(0),
  sizes: z.array(z.object({
    name: z.string().min(1, 'Tên size không được rỗng'),
    stock: z.number().int().min(0, 'Số lượng size phải lớn hơn hoặc bằng 0')
  })).optional(),
  rating: z.number().min(0, 'Rating phải từ 0-5').max(5, 'Rating phải từ 0-5').default(0),
  badge: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được rỗng').max(100, 'Tên sản phẩm quá dài').optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'Giá phải lớn hơn hoặc bằng 0').optional(),
  compareAtPrice: z.number().min(0, 'Giá gốc phải lớn hơn hoặc bằng 0').optional(),
  category: z.string().min(1, 'Danh mục không được rỗng').optional(),
  image: z.string().url('Ảnh chính phải là URL hợp lệ').nullable().optional(),
  images: z.array(z.string().url('Ảnh phải là URL hợp lệ')).optional(),
  stock: z.number().int().min(0, 'Số lượng tồn kho phải lớn hơn hoặc bằng 0').optional(),
  sizes: z.array(z.object({
    name: z.string().min(1, 'Tên size không được rỗng'),
    stock: z.number().int().min(0, 'Số lượng size phải lớn hơn hoặc bằng 0')
  })).optional(),
  rating: z.number().min(0, 'Rating phải từ 0-5').max(5, 'Rating phải từ 0-5').optional(),
  badge: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type OtpVerificationInput = z.infer<typeof otpVerificationSchema>