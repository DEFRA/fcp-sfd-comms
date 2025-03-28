import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import mockCommsRequest from '../../../../mocks/comms-request/v3.js'

const mockSendEmail = jest.fn()
const mockGetNotificationById = jest.fn()
const mockUpdateNotificationStatus = jest.fn()
const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: mockSendEmail,
    getNotificationById: mockGetNotificationById
  }
}))

jest.unstable_mockModule('../../../../../src/repos/notification-log.js', () => ({
  updateNotificationStatus: mockUpdateNotificationStatus
}))

jest.unstable_mockModule('../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

jest.unstable_mockModule('../../../../../src/config/index.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'notify.statusCheckMaxAttempts') return 3
      if (key === 'notify.statusCheckInterval') return 10
    })
  }
}))

const { trySendViaNotify } = await import('../../../../../src/messaging/inbound/comms-request/notify-service/try-send-via-notify.js')
const { checkNotificationStatus } = await import('../../../../../src/messaging/inbound/comms-request/notify-service/check-notification-status.js')

const { finishedStatus } = await import('../../../../../src/constants/notify-statuses.js')

describe('Notify Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send email successfully', async () => {
    const mockResponse = { data: { id: 'mock-id' } }
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
    const mockError = {
      response: {
        status: 400,
        data: {
          error: {
            status_code: 400,
            errors: [
              {
                error: 'mock-error'
              }
            ]
          }
        }
      }
    }

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
      'Failed to send email via GOV Notify. Error code: 400'
    )
    expect(response).toBeNull()
    expect(error).toEqual(mockError.response)
  })

  test('should check notification status successfully', async () => {
    const mockStatus = finishedStatus[0]
    mockGetNotificationById.mockResolvedValue({ data: { status: mockStatus } })
    const data = mockCommsRequest.data
    const notifyId = 'mock-notify-id'

    const status = await checkNotificationStatus(data.message, data.commsAddresses, notifyId)

    expect(mockGetNotificationById).toHaveBeenCalledWith(notifyId)
    expect(mockUpdateNotificationStatus).toHaveBeenCalledWith(data.message, data.commsAddresses, mockStatus)
    expect(status).toEqual(mockStatus)
  })

  test('should retry notification status check until max attempts reached', async () => {
    mockGetNotificationById.mockResolvedValue({ data: { status: 'sending' } })
    const data = mockCommsRequest.data
    const notifyId = 'mock-notify-id'

    await expect(checkNotificationStatus(data.message, data.commsAddresses, notifyId))
      .rejects.toThrow(`Status check for notification ${notifyId} timed out after 3 attempts`)

    expect(mockGetNotificationById).toHaveBeenCalledTimes(3)
    expect(mockLoggerError).not.toHaveBeenCalled()
  })

  test('should log an error if checking notification status fails', async () => {
    const mockError = new Error('Failed to fetch status')
    mockGetNotificationById.mockRejectedValue(mockError)
    const data = mockCommsRequest.data
    const notifyId = 'mock-notify-id'

    await expect(checkNotificationStatus(data.message, data.commsAddresses, notifyId))
      .rejects.toThrow(`Status check for notification ${notifyId} timed out after 3 attempts`)

    expect(mockLoggerError).toHaveBeenCalledWith(
      `Failed checking notification ${notifyId}: Failed to fetch status`
    )
  })
})
