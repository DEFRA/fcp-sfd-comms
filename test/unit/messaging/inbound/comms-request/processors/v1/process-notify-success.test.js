import { vi, describe, test, expect, beforeEach, afterAll } from 'vitest'

import v1CommsRequest from '../../../../../../mocks/comms-request/v1.js'

import { createLogger } from '../../../../../../../src/logging/logger.js'
import { getOriginalNotificationRequest } from '../../../../../../../src/repos/notification-log.js'
import { checkNotificationStatus } from '../../../../../../../src/messaging/inbound/comms-request/notify-service/check-notification-status.js'
import { publishRetryRequest } from '../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js'
import { publishRetryExpired } from '../../../../../../../src/messaging/outbound/retry-expired/publish-expired.js'
import { processNotifySuccess } from '../../../../../../../src/messaging/inbound/comms-request/processors/v1/process-notify-success.js'

vi.mock('../../../../../../../src/repos/notification-log.js')

vi.mock('../../../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()

vi.mock('../../../../../../../src/messaging/inbound/comms-request/notify-service/check-notification-status.js')

vi.mock('../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js')

vi.mock('../../../../../../../src/messaging/outbound/retry-expired/publish-expired.js')

vi.mock('../../../../../../../src/messaging/outbound/notification-status/publish-status.js')

describe('comms request v1 notify success', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  test('should handle failed status check and log error', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    checkNotificationStatus.mockRejectedValue(new Error('Update failed'))

    await processNotifySuccess(v1CommsRequest, 'test@example.com', mockResponse)

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/Failed checking notification/))
  })

  test.each([
    'created',
    'sending',
    'delivered',
    'permanent-failure'
  ])('should not attempt retry if status is %s', async (status) => {
    checkNotificationStatus.mockResolvedValue(status)

    expect(publishRetryRequest).not.toHaveBeenCalled()
  })

  test('should handle checkNotificationStatus failure and log error', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    checkNotificationStatus.mockRejectedValue(new Error('Status check failed'))

    await processNotifySuccess(v1CommsRequest, 'test@example.com', mockResponse)

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/Failed checking notification status/))
  })

  test.each(
    [
      '2025-01-01T11:00:00.000Z',
      '2025-01-08T10:44:59.000Z'
    ]
  )('should schedule retry on temporary-failure within retry window (%s)', async (time) => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    const mockMessage = {
      ...v1CommsRequest,
      data: {
        ...v1CommsRequest.data,
        correlationId: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf'
      }
    }

    vi.setSystemTime(new Date(time))

    checkNotificationStatus.mockResolvedValue('temporary-failure')

    getOriginalNotificationRequest.mockResolvedValue({
      id: 'mock-id',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(publishRetryRequest).toHaveBeenCalledWith(mockMessage, 'test@example.com', 15)
  })

  test.each(
    [
      '2025-01-08T10:45:00.000Z',
      '2025-01-08T11:00:00.000Z'
    ]
  )('should not schedule retry on temporary-failure outside retry window (%s)', async (time) => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    const mockMessage = {
      ...v1CommsRequest,
      data: {
        ...v1CommsRequest.data,
        correlationId: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf'
      }
    }

    vi.setSystemTime(new Date(time))

    checkNotificationStatus.mockResolvedValue('temporary-failure')

    getOriginalNotificationRequest.mockResolvedValue({
      id: 'mock-id',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(publishRetryRequest).not.toHaveBeenCalled()
  })

  test('should schedule retry if no correlationId', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    const mockMessage = {
      ...v1CommsRequest,
      data: {
        ...v1CommsRequest.data
      }
    }

    checkNotificationStatus.mockResolvedValue('temporary-failure')

    getOriginalNotificationRequest.mockResolvedValue({
      id: 'mock-id',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(publishRetryRequest).toHaveBeenCalledWith(mockMessage, 'test@example.com', 15)
  })

  test('should schedule retry on technical-failure', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    const mockMessage = {
      ...v1CommsRequest,
      data: {
        ...v1CommsRequest.data,
        correlationId: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf'
      }
    }

    checkNotificationStatus.mockResolvedValue('technical-failure')

    getOriginalNotificationRequest.mockResolvedValue({
      id: 'cbbcdc5d-35e2-43e6-8c15-002a94f1dcce',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(publishRetryRequest).toHaveBeenCalledWith(mockMessage, 'test@example.com', 15)
  })

  test('should log correlationId if set when retry window expires', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    const mockMessage = {
      ...v1CommsRequest,
      data: {
        ...v1CommsRequest.data,
        correlationId: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf'
      }
    }

    vi.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))

    checkNotificationStatus.mockResolvedValue('temporary-failure')

    getOriginalNotificationRequest.mockResolvedValue({
      id: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(mockLogger.info).toHaveBeenCalledWith(`Retry window expired for request: ${mockMessage.data.correlationId}`)
  })

  test('should publish retry expired event if retry window expired', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    const mockMessage = {
      ...v1CommsRequest,
      data: {
        ...v1CommsRequest.data,
        correlationId: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf',
        recipient: 'test@example.com'
      }
    }

    vi.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))

    getOriginalNotificationRequest.mockResolvedValue('temporary-failure')

    getOriginalNotificationRequest.mockResolvedValue({
      id: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(publishRetryExpired).toHaveBeenCalledWith(mockMessage, 'test@example.com')
  })

  afterAll(() => {
    vi.useFakeTimers()
  })
})
