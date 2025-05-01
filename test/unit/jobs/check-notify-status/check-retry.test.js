import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'

import mockCommsRequest from '../../../mocks/comms-request/v1.js'

import { getOriginalNotificationRequest } from '../../../../src/repos/notification-log.js'
import { publishRetryRequest } from '../../../../src/messaging/outbound/notification-retry/notification-retry.js'
import { publishRetryExpired } from '../../../../src/messaging/outbound/retry-expired/publish-expired.js'
import { checkRetry } from '../../../../src/jobs/check-notify-status/check-retry.js'

vi.mock('../../../../src/repos/notification-log.js')

vi.mock('../../../../src/messaging/outbound/notification-retry/notification-retry.js')
vi.mock('../../../../src/messaging/outbound/retry-expired/publish-expired.js')

describe('request retry checker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  test('should retry technical failures regardless of time', async () => {
    vi.setSystemTime(new Date('2024-01-01T11:00:00.000Z'))

    await checkRetry(mockCommsRequest, new Date('2025-01-01T11:00:00.000Z'), 'technical-failure')

    expect(publishRetryRequest).toHaveBeenCalledWith(
      mockCommsRequest,
      mockCommsRequest.data.recipient,
      15
    )
  })

  test('should calculate retry using original message time', async () => {
    vi.setSystemTime(new Date('2025-01-08T11:01:00.000Z'))

    getOriginalNotificationRequest.mockResolvedValue({
      message: mockCommsRequest,
      createdAt: new Date('2025-01-01T11:00:00.000Z'),
      statusDetails: {
        notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
        status: 'sending'
      }
    })

    const mockMessage = {
      ...mockCommsRequest,
      data: {
        ...mockCommsRequest.data,
        correlationId: '6ac51d8a-3488-4a17-ba35-b42381646317'
      }
    }

    await checkRetry(mockMessage, new Date('2025-01-08T10:59:00.000Z'), 'temporary-failure')

    expect(publishRetryRequest).not.toHaveBeenCalled()
  })

  test('should throw error if original notification is not found', async () => {
    getOriginalNotificationRequest.mockResolvedValue(null)

    const mockMessage = {
      ...mockCommsRequest,
      data: {
        ...mockCommsRequest.data,
        correlationId: '6ac51d8a-3488-4a17-ba35-b42381646317'
      }
    }

    await expect(checkRetry(mockMessage, new Date('2025-01-08T10:59:00.000Z'), 'temporary-failure'))
      .rejects
      .toThrow('Cannot calculate retry window for correlation id (6ac51d8a-3488-4a17-ba35-b42381646317) - original request not found')
  })

  test.each(
    [
      '2025-01-01T11:00:00.000Z',
      '2025-01-08T10:44:59.000Z'
    ]
  )('should retry temporary failures within retry window %s', async (time) => {
    vi.setSystemTime(new Date(time))

    await checkRetry(mockCommsRequest, new Date('2025-01-01T11:00:00.000Z'), 'temporary-failure')

    expect(publishRetryRequest).toHaveBeenCalledWith(
      mockCommsRequest,
      mockCommsRequest.data.recipient,
      15
    )
  })

  test.each(
    [
      '2025-01-08T10:45:00.000Z',
      '2025-01-08T11:00:00.000Z'
    ]
  )('should not retry temporary failures outside retry window %s', async (time) => {
    vi.setSystemTime(new Date(time))

    await checkRetry(mockCommsRequest, new Date('2025-01-01T11:00:00.000Z'), 'temporary-failure')

    expect(publishRetryRequest).not.toHaveBeenCalled()
  })

  test('should publish expiry event if retry window has expired', async () => {
    vi.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))

    await checkRetry(mockCommsRequest, new Date('2025-01-01T11:00:00.000Z'), 'temporary-failure')

    expect(publishRetryExpired).toHaveBeenCalledWith(
      mockCommsRequest,
      mockCommsRequest.data.recipient
    )
  })

  afterAll(() => {
    vi.useRealTimers()
  })
})
