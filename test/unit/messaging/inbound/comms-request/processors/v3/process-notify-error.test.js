import { vi, describe, test, expect, beforeEach } from 'vitest'

import v3CommsRequest from '../../../../../../mocks/comms-request/v3.js'

import { updateNotificationStatus } from '../../../../../../../src/repos/notification-log.js'
import { publishRetryRequest } from '../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js'
import { processNotifyError } from '../../../../../../../src/messaging/inbound/comms-request/processors/v3/process-notify-error.js'

vi.mock('../../../../../../../src/repos/notification-log.js', () => ({
  addNotificationRequest: vi.fn(),
  checkNotificationIdempotency: vi.fn(),
  updateNotificationStatus: vi.fn(),
  getOriginalNotificationRequest: vi.fn()
}))

vi.mock('../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js', () => ({
  publishRetryRequest: vi.fn()
}))

vi.mock('../../../../../../../src/messaging/outbound/notification-status/publish-status.js', () => ({
  publishStatus: vi.fn()
}))

const mockLoggerInfo = vi.fn()
const mockLoggerWarn = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('../../../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    warn: (...args) => mockLoggerWarn(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

describe('comms request v3 notify error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    expect(updateNotificationStatus).toHaveBeenCalledWith(v3CommsRequest, expect.any(String), 'internal-failure', mockError.data)
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

    expect(updateNotificationStatus).toHaveBeenCalledWith(v3CommsRequest, expect.any(String), 'technical-failure', mockError.data)
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

    expect(publishRetryRequest).toHaveBeenCalledWith(v3CommsRequest, 'test@example.com', 15)
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

    expect(publishRetryRequest).not.toHaveBeenCalled()
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

    updateNotificationStatus.mockRejectedValue(new Error('Test error'))

    await processNotifyError(v3CommsRequest, 'test@example.com', mockError)

    expect(mockLoggerError).toHaveBeenCalledWith('Error handling failed notification: Test error')
  })
})
