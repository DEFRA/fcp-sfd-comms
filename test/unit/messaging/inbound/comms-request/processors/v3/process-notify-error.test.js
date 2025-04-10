import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import v3CommsRequest from '../../../../../../mocks/comms-request/v3.js'

const mockLoggerInfo = jest.fn()
const mockLoggerWarn = jest.fn()
const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    warn: (...args) => mockLoggerWarn(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

const mockAddNotificationRequest = jest.fn()
const mockCheckNotificationIdempotency = jest.fn()
const mockUpdateNotificationStatus = jest.fn()
const mockGetOriginalNotificationRequest = jest.fn()

jest.unstable_mockModule('../../../../../../../src/repos/notification-log.js', () => ({
  addNotificationRequest: mockAddNotificationRequest,
  checkNotificationIdempotency: mockCheckNotificationIdempotency,
  updateNotificationStatus: mockUpdateNotificationStatus,
  getOriginalNotificationRequest: mockGetOriginalNotificationRequest
}))

const mockPublishRetryRequest = jest.fn()

jest.unstable_mockModule('../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js', () => ({
  publishRetryRequest: mockPublishRetryRequest
}))

jest.unstable_mockModule('../../../../../../../src/messaging/outbound/notification-status/publish-status.js', () => ({
  publishStatus: jest.fn()
}))

const { processNotifyError } = await import('../../../../../../../src/messaging/inbound/comms-request/processors/v3/process-notify-error.js')

describe('comms request v3 notify error', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should update notification status to INTERNAL_FAILURE if request fails', async () => {
    const mockError = {
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

    await processNotifyError(v3CommsRequest, 'test@example.com', mockError)

    expect(mockUpdateNotificationStatus).toHaveBeenCalledWith(v3CommsRequest, expect.any(String), 'internal-failure', mockError.data)
  })

  test('should update notification status to TECHNICAL_FAILURE if request fails with server error', async () => {
    const mockError = {
      status: 500,
      data: {
        error: {
          status_code: 500,
          errors: [
            {
              error: 'Internal server error'
            }
          ]
        }
      }
    }

    await processNotifyError(v3CommsRequest, 'test@example.com', mockError)

    expect(mockUpdateNotificationStatus).toHaveBeenCalledWith(v3CommsRequest, expect.any(String), 'technical-failure', mockError.data)
  })

  test('should call publish retry if error code is in 5xx range', async () => {
    const mockError = {
      status: 500,
      data: {
        error: {
          status_code: 500,
          errors: [
            {
              error: 'Internal server error'
            }
          ]
        }
      }
    }

    await processNotifyError(v3CommsRequest, 'test@example.com', mockError)

    expect(mockPublishRetryRequest).toHaveBeenCalledWith(v3CommsRequest, 'test@example.com', 15)
  })

  test.each([
    400,
    403
  ])('should publish retry if error code (%d) not in 5xx range', async (code) => {
    const mockError = {
      status: code,
      data: {
        error: {
          status_code: code,
          errors: [
            {
              error: 'Internal server error'
            }
          ]
        }
      }
    }

    await processNotifyError(v3CommsRequest, 'test@example.com', mockError)

    expect(mockPublishRetryRequest).not.toHaveBeenCalled()
  })

  test('should log error if exception thrown', async () => {
    const mockError = {
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

    mockUpdateNotificationStatus.mockRejectedValue(new Error('Test error'))

    await processNotifyError(v3CommsRequest, 'test@example.com', mockError)

    expect(mockLoggerError).toHaveBeenCalledWith('Error handling failed notification: Test error')
  })
})
