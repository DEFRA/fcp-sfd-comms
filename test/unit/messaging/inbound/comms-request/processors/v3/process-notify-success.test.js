import { vi, describe, test, expect, beforeEach, afterAll } from 'vitest'

import v3CommsRequest from '../../../../../../mocks/comms-request/v3.js'

import { getOriginalNotificationRequest } from '../../../../../../../src/repos/notification-log.js'
import { checkNotificationStatus } from '../../../../../../../src/messaging/inbound/comms-request/notify-service/check-notification-status.js'
import { publishRetryRequest } from '../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js'
import { publishRetryExpired } from '../../../../../../../src/messaging/outbound/retry-expired/publish-expired.js'

import { processNotifySuccess } from '../../../../../../../src/messaging/inbound/comms-request/processors/v3/process-notify-success.js'

vi.mock('../../../../../../../src/repos/notification-log.js', () => ({
  addNotificationRequest: vi.fn(),
  checkNotificationIdempotency: vi.fn(),
  updateNotificationStatus: vi.fn(),
  getOriginalNotificationRequest: vi.fn()
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

vi.mock('../../../../../../../src/messaging/inbound/comms-request/notify-service/check-notification-status.js', () => ({
  checkNotificationStatus: vi.fn()
}))

vi.mock('../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js', () => ({
  publishRetryRequest: vi.fn()
}))

vi.mock('../../../../../../../src/messaging/outbound/retry-expired/publish-expired.js', () => ({
  publishRetryExpired: vi.fn()
}))

vi.mock('../../../../../../../src/messaging/outbound/notification-status/publish-status.js')

describe('comms request v3 notify success', () => {
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

    await processNotifySuccess(v3CommsRequest, 'test@example.com', mockResponse)

    expect(mockLoggerError).toHaveBeenCalledWith(expect.stringMatching(/Failed checking notification/))
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

    await processNotifySuccess(v3CommsRequest, 'test@example.com', mockResponse)

    expect(mockLoggerError).toHaveBeenCalledWith(expect.stringMatching(/Failed checking notification status/))
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
      ...v3CommsRequest,
      data: {
        ...v3CommsRequest.data,
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
      ...v3CommsRequest,
      data: {
        ...v3CommsRequest.data,
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
      ...v3CommsRequest,
      data: {
        ...v3CommsRequest.data
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
      ...v3CommsRequest,
      data: {
        ...v3CommsRequest.data,
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
      ...v3CommsRequest,
      data: {
        ...v3CommsRequest.data,
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

    expect(mockLoggerInfo).toHaveBeenCalledWith(`Retry window expired for request: ${mockMessage.data.correlationId}`)
  })

  test('should publish retry expired event if retry window expired', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    const mockMessage = {
      ...v3CommsRequest,
      data: {
        ...v3CommsRequest.data,
        correlationId: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf',
        commsAddresses: 'test@example.com'
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
