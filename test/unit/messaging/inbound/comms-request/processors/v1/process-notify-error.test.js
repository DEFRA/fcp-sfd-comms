import { vi, describe, test, expect, beforeEach } from 'vitest'

import v1CommsRequest from '../../../../../../mocks/comms-request/v1.js'

import { createLogger } from '../../../../../../../src/logging/logger.js'
import { updateNotificationStatus } from '../../../../../../../src/repos/notification-log.js'
import { publishRetryRequest } from '../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js'
import { processNotifyError } from '../../../../../../../src/messaging/inbound/comms-request/processors/v1/process-notify-error.js'

vi.mock('../../../../../../../src/repos/notification-log.js')
vi.mock('../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js')
vi.mock('../../../../../../../src/messaging/outbound/notification-status/publish-status.js')

vi.mock('../../../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()

describe('comms request v1 notify error', () => {
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

    await processNotifyError(v1CommsRequest, 'test@example.com', mockError)

    expect(updateNotificationStatus).toHaveBeenCalledWith(v1CommsRequest, {
      status: 'internal-failure',
      error: mockError.data
    })
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

    await processNotifyError(v1CommsRequest, 'test@example.com', mockError)

    expect(updateNotificationStatus).toHaveBeenCalledWith(v1CommsRequest, {
      status: 'technical-failure',
      error: mockError.data
    })
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

    await processNotifyError(v1CommsRequest, 'test@example.com', mockError)

    expect(publishRetryRequest).toHaveBeenCalledWith(v1CommsRequest, 'test@example.com', 15)
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

    await processNotifyError(v1CommsRequest, 'test@example.com', mockError)

    expect(publishRetryRequest).not.toHaveBeenCalled()
  })

  test('should log error if exception thrown', async () => {
    const mockNotifyError = {
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

    const mockError = new Error('Test error')

    updateNotificationStatus.mockRejectedValue(mockError)

    await processNotifyError(v1CommsRequest, 'test@example.com', mockNotifyError)

    expect(mockLogger.error).toHaveBeenCalledWith(
      mockError,
      `Error processing gov notify error response for message: ${v1CommsRequest.source}-${v1CommsRequest.id}`
    )
  })

  test('should log warning if notify error contains single error', async () => {
    const mockNotifyError = {
      status: 400,
      data: {
        errors: [
          {
            message: 'Missing personalisation'
          }
        ]
      }
    }

    await processNotifyError(v1CommsRequest, 'test@example.com', mockNotifyError)

    expect(mockLogger.warn).toHaveBeenCalledWith(
      `Failed to send via GOV Notify for request ${v1CommsRequest.source}-${v1CommsRequest.id}. Status code: ${mockNotifyError.status}, Message: Missing personalisation`
    )
  })

  test('should log warning if notify error contains single error', async () => {
    const mockNotifyError = {
      status: 400,
      data: {
        errors: [
          {
            message: 'Missing personalisation'
          },
          {
            message: 'Invalid email address'
          }
        ]
      }
    }

    await processNotifyError(v1CommsRequest, 'test@example.com', mockNotifyError)

    expect(mockLogger.warn).toHaveBeenCalledWith(
      `Failed to send via GOV Notify for request ${v1CommsRequest.source}-${v1CommsRequest.id}. Status code: ${mockNotifyError.status}, Message: Missing personalisation, Invalid email address`
    )
  })
})
