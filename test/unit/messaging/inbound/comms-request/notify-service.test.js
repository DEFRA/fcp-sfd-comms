import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import mockCommsRequest from '../../../../mocks/comms-request/v3.js'

const mockSendEmail = jest.fn()

jest.unstable_mockModule('../../../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: mockSendEmail
  }
}))

jest.unstable_mockModule('../../../../../src/repos/notification-log.js', () => ({
  addNotificationRequest: jest.fn(),
  checkNotificationIdempotency: jest.fn(),
  updateNotificationStatus: jest.fn()
}))

const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

const { trySendViaNotify } = await import('../../../../../src/messaging/inbound/comms-request/notify-service.js')

describe('Notify Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send email successfully', async () => {
    const mockResponse = { id: 'mock-id' }

    mockSendEmail.mockResolvedValue(mockResponse)

    const data = mockCommsRequest.data

    const [response, error] = await trySendViaNotify(data.notifyTemplateId, data.commsAddresses, {
      personalisation: data.personalisation,
      reference: data.reference
    })

    expect(mockSendEmail).toHaveBeenCalledWith(
      data.notifyTemplateId,
      data.commsAddresses,
      {
        personalisation: data.personalisation,
        reference: data.reference
      }
    )

    expect(response).toEqual(mockResponse)
    expect(error).toBeNull()
  })

  test('should handle errors when sending email fails', async () => {
    const mockError = new Error('Failed to send email')

    mockSendEmail.mockRejectedValue(mockError)

    const data = mockCommsRequest.data

    const [response, error] = await trySendViaNotify(data.notifyTemplateId, data.commsAddresses, {
      personalisation: data.personalisation,
      reference: data.reference
    })

    expect(mockSendEmail).toHaveBeenCalledWith(
      data.notifyTemplateId,
      data.commsAddresses,
      {
        personalisation: data.personalisation,
        reference: data.reference
      }
    )

    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to send email via GOV Notify: Failed to send email'
    )
    expect(response).toBeNull()
    expect(error).toEqual(mockError)
  })
})

// import { jest, describe, test, expect, beforeEach } from '@jest/globals'

// import mockCommsRequest from '../../../../mocks/comms-request/v3.js'

// const mockSendEmail = jest.fn()
// const mockGetNotificationById = jest.fn()
// const mockUpdateNotificationStatus = jest.fn()
// const mockLoggerError = jest.fn()
// const mockConfigGet = jest.fn()

// jest.unstable_mockModule('../../../../../src/notify/notify-client.js', () => ({
//   default: {
//     sendEmail: mockSendEmail,
//     getNotificationById: mockGetNotificationById
//   }
// }))

// jest.unstable_mockModule('../../../../../src/logging/logger.js', () => ({
//   createLogger: () => ({
//     error: (...args) => mockLoggerError(...args)
//   })
// }))

// jest.unstable_mockModule('../../../../../src/repos/notification-log.js', () => ({
//   updateNotificationStatus: mockUpdateNotificationStatus
// }))

// jest.unstable_mockModule('../../../../../src/config/index.js', () => ({
//   config: {
//     get: mockConfigGet
//   }
// }))

// const { trySendViaNotify, checkNotificationStatus } = await import('../../../../../src/messaging/inbound/comms-request/notify-service.js')

// describe('Notify Service', () => {
//   beforeEach(() => {
//     jest.clearAllMocks()
//   })

//   test('should send email successfully', async () => {
//     const mockResponse = { id: 'mock-id' }
//     mockSendEmail.mockResolvedValue(mockResponse)
//     const data = mockCommsRequest.data

//     const [response, error] = await trySendViaNotify(data.notifyTemplateId, data.commsAddresses, {
//       personalisation: data.personalisation,
//       reference: data.reference
//     })

//     expect(mockSendEmail).toHaveBeenCalledWith(
//       data.notifyTemplateId,
//       data.commsAddresses,
//       {
//         personalisation: data.personalisation,
//         reference: data.reference
//       }
//     )

//     expect(response).toEqual(mockResponse)
//     expect(error).toBeNull()
//   })

//   test('should handle errors when sending email fails', async () => {
//     const mockError = new Error('Failed to send email')
//     mockSendEmail.mockRejectedValue(mockError)
//     const data = mockCommsRequest.data

//     const [response, error] = await trySendViaNotify(data.notifyTemplateId, data.commsAddresses, {
//       personalisation: data.personalisation,
//       reference: data.reference
//     })

//     expect(mockSendEmail).toHaveBeenCalledWith(
//       data.notifyTemplateId,
//       data.commsAddresses,
//       {
//         personalisation: data.personalisation,
//         reference: data.reference
//       }
//     )

//     expect(mockLoggerError).toHaveBeenCalledWith(
//       'Failed to send email via GOV Notify: Failed to send email'
//     )
//     expect(response).toBeNull()
//     expect(error).toEqual(mockError)
//   })

//   test('should check notification status until completion', async () => {
//     const notifyId = 'notify-id'
//     const mockMessage = 'mock-message'
//     const recipient = 'recipient@example.com'

//     mockConfigGet.mockImplementation((key) => {
//       if (key === 'notify.statusCheckMaxAttempts') return 2
//       if (key === 'notify.statusCheckInterval') return 10
//       return null
//     })

//     mockGetNotificationById
//       .mockResolvedValueOnce({ data: { status: 'sending' } })
//       .mockResolvedValueOnce({ data: { status: 'delivered' } })

//     const status = await checkNotificationStatus(mockMessage, recipient, notifyId)

//     expect(status).toBe('delivered')
//     expect(mockUpdateNotificationStatus).toHaveBeenCalledTimes(2)
//   })

//   test('should log error if status check fails', async () => {
//     const notifyId = 'notify-id'
//     const mockMessage = 'mock-message'
//     const recipient = 'recipient@example.com'

//     mockConfigGet.mockReturnValue(2)
//     mockGetNotificationById.mockRejectedValue(new Error('Network Error'))

//     await checkNotificationStatus(mockMessage, recipient, notifyId)

//     expect(mockLoggerError).toHaveBeenCalledWith(
//       `Failed checking notification ${notifyId}: Network Error`
//     )
//   })

//   test('should throw error if status check times out', async () => {
//     const notifyId = 'notify-id'
//     const mockMessage = 'mock-message'
//     const recipient = 'recipient@example.com'

//     mockConfigGet.mockReturnValue(2)
//     mockGetNotificationById.mockResolvedValue({ data: { status: 'sending' } })

//     await expect(checkNotificationStatus(mockMessage, recipient, notifyId)).rejects.toThrow(
//       `Status check for notification ${notifyId} timed out after 2 attempts`
//     )
//   })
// })
