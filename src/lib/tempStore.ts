// Temporary storage cho registration data (sử dụng database)

import { prisma } from './prisma'

// Lưu registration data tạm thời vào database
export async function storeRegistrationData(transactionId: string, data: {
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  dateOfBirth: Date
  password: string
}): Promise<void> {
  console.log(`Storing temp data for transactionId: ${transactionId}`)

  // Set expiry 10 phút từ bây giờ
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)

  await (prisma as any).tempRegistration.create({
    data: {
      transactionId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      dateOfBirth: data.dateOfBirth,
      password: data.password,
      expiresAt
    }
  })

  console.log(`Temp registration data stored in database`)
}

// Lấy registration data từ database
export async function getRegistrationData(transactionId: string): Promise<{
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  dateOfBirth: Date
  password: string
} | null> {
  console.log(`Getting temp data for transactionId: ${transactionId}`)

  try {
    const tempData = await (prisma as any).tempRegistration.findUnique({
      where: { transactionId }
    })

    if (!tempData) {
      console.log('Temp registration data not found')
      return null
    }

    // Check expiry
    const now = new Date()
    if (tempData.expiresAt < now) {
      console.log('Temp registration data expired, deleting...')
      await (prisma as any).tempRegistration.delete({
        where: { transactionId }
      })
      return null
    }

    console.log('Temp registration data found and valid')
    return {
      firstName: tempData.firstName,
      lastName: tempData.lastName,
      email: tempData.email,
      phoneNumber: tempData.phoneNumber || undefined,
      dateOfBirth: tempData.dateOfBirth,
      password: tempData.password
    }
  } catch (error) {
    console.error('Error getting temp registration data:', error)
    return null
  }
}

// Xóa registration data sau khi sử dụng
export async function removeRegistrationData(transactionId: string): Promise<void> {
  console.log(`Removing temp data for transactionId: ${transactionId}`)
  try {
    await (prisma as any).tempRegistration.delete({
      where: { transactionId }
    })
    console.log('Temp registration data removed')
  } catch (error) {
    console.error('Error removing temp registration data:', error)
  }
}