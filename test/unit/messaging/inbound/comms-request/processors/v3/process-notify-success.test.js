import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals'

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

const mockCheckNotificationStatus = jest.fn()

jest.unstable_mockModule('../../../../../../../src/messaging/inbound/comms-request/notify-service/check-notification-status.js', () => ({
  checkNotificationStatus: mockCheckNotificationStatus
}))

const mockPublishRetryRequest = jest.fn()

jest.unstable_mockModule('../../../../../../../src/messaging/outbound/notification-retry.js', () => ({
  publishRetryRequest: mockPublishRetryRequest
}))

jest.unstable_mockModule('../../../../../../../src/messaging/outbound/notification-status/publish-status.js', () => ({
  publishStatus: jest.fn()
}))

const { processNotifySuccess } = await import('../../../../../../../src/messaging/inbound/comms-request/processors/v3/process-notify-success.js')

describe('comms request v3 notify success', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  test('should handle failed status check and log error', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    mockCheckNotificationStatus.mockRejectedValue(new Error('Update failed'))

    await processNotifySuccess(v3CommsRequest, 'test@example.com', mockResponse)

    expect(mockLoggerError).toHaveBeenCalledWith(expect.stringMatching(/Failed checking notification/))
  })

  test.each([
    'created',
    'sending',
    'delivered',
    'permanent-failure'
  ])('should not attempt retry if status is %s', async (status) => {
    mockCheckNotificationStatus.mockResolvedValue(status)

    expect(mockPublishRetryRequest).not.toHaveBeenCalled()
  })

  test('should handle checkNotificationStatus failure and log error', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    mockCheckNotificationStatus.mockRejectedValue(new Error('Status check failed'))

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

    jest.setSystemTime(new Date(time))

    mockCheckNotificationStatus.mockResolvedValue('temporary-failure')

    mockGetOriginalNotificationRequest.mockResolvedValue({
      id: 'mock-id',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(mockPublishRetryRequest).toHaveBeenCalledWith(mockMessage, 'test@example.com', 15)
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

    jest.setSystemTime(new Date(time))

    mockCheckNotificationStatus.mockResolvedValue('temporary-failure')

    mockGetOriginalNotificationRequest.mockResolvedValue({
      id: 'mock-id',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(mockPublishRetryRequest).not.toHaveBeenCalled()
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

    mockCheckNotificationStatus.mockResolvedValue('temporary-failure')

    mockGetOriginalNotificationRequest.mockResolvedValue({
      id: 'mock-id',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(mockPublishRetryRequest).toHaveBeenCalledWith(mockMessage, 'test@example.com', 15)
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

    mockCheckNotificationStatus.mockResolvedValue('technical-failure')

    mockGetOriginalNotificationRequest.mockResolvedValue({
      id: 'cbbcdc5d-35e2-43e6-8c15-002a94f1dcce',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(mockPublishRetryRequest).toHaveBeenCalledWith(mockMessage, 'test@example.com', 15)
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

    jest.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))

    mockCheckNotificationStatus.mockResolvedValue('temporary-failure')

    mockGetOriginalNotificationRequest.mockResolvedValue({
      id: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf',
      createdAt: '2025-01-01T11:00:00.000Z'
    })

    await processNotifySuccess(mockMessage, 'test@example.com', mockResponse)

    expect(mockLoggerInfo).toHaveBeenCalledWith(`Retry window expired for request: ${mockMessage.data.correlationId}`)
  })

  afterAll(() => {
    jest.useFakeTimers()
  })
})
