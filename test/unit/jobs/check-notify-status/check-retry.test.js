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

    const mockRetryId = '4832e930-276b-474d-b1ab-ff699ba5b1e0'

    const mockNotification = {
      id: mockRetryId,
      message: mockCommsRequest,
      createdAt: new Date('2025-01-01T11:00:00.000Z'),
      statusDetails: {
        notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
        status: 'sending'
      }
    }

    await checkRetry(mockNotification, 'technical-failure')

    expect(publishRetryRequest).toHaveBeenCalledWith(
      mockCommsRequest,
      mockCommsRequest.data.recipient,
      15,
      mockRetryId
    )
  })

  test('should calculate retry using original message time', async () => {
    vi.setSystemTime(new Date('2025-01-08T11:01:00.000Z'))

    const mockRetryId = '4832e930-276b-474d-b1ab-ff699ba5b1e0'

    getOriginalNotificationRequest.mockResolvedValue({
      message: mockCommsRequest,
      createdAt: new Date('2025-01-01T11:00:00.000Z'),
      statusDetails: {
        notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
        status: 'sending'
      }
    })

    const mockNotification = {
      id: mockRetryId,
      message: {
        ...mockCommsRequest,
        data: {
          ...mockCommsRequest.data,
          correlationId: '6ac51d8a-3488-4a17-ba35-b42381646317'
        }
      },
      createdAt: new Date('2025-01-07T11:00:00.000Z'),
      statusDetails: {
        notificationId: 'a22edfc0-5249-486e-a98f-0d9f8f4a9d7a',
        status: 'sending'
      }
    }

    await checkRetry(mockNotification, 'temporary-failure')

    expect(publishRetryRequest).not.toHaveBeenCalled()
  })

  test('should throw error if original notification is not found', async () => {
    getOriginalNotificationRequest.mockResolvedValue(null)

    const mockRetryId = '4832e930-276b-474d-b1ab-ff699ba5b1e0'

    const mockNotification = {
      id: mockRetryId,
      message: {
        ...mockCommsRequest,
        data: {
          ...mockCommsRequest.data,
          correlationId: '6ac51d8a-3488-4a17-ba35-b42381646317'
        }
      },
      createdAt: new Date('2025-01-07T11:00:00.000Z'),
      statusDetails: {
        notificationId: 'a22edfc0-5249-486e-a98f-0d9f8f4a9d7a',
        status: 'sending'
      }
    }

    await expect(checkRetry(mockNotification, 'temporary-failure'))
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

    const mockRetryId = '4832e930-276b-474d-b1ab-ff699ba5b1e0'

    const mockNotification = {
      id: mockRetryId,
      message: mockCommsRequest,
      createdAt: new Date('2025-01-01T11:00:00.000Z'),
      statusDetails: {
        notificationId: 'a22edfc0-5249-486e-a98f-0d9f8f4a9d7a',
        status: 'sending'
      }
    }

    await checkRetry(mockNotification, new Date('2025-01-01T11:00:00.000Z'), 'temporary-failure')

    expect(publishRetryRequest).toHaveBeenCalledWith(
      mockCommsRequest,
      mockCommsRequest.data.recipient,
      15,
      mockRetryId
    )
  })

  test.each(
    [
      '2025-01-08T10:45:00.000Z',
      '2025-01-08T11:00:00.000Z'
    ]
  )('should not retry temporary failures outside retry window %s', async (time) => {
    vi.setSystemTime(new Date(time))

    const mockRetryId = '4832e930-276b-474d-b1ab-ff699ba5b1e0'

    getOriginalNotificationRequest.mockResolvedValue({
      message: mockCommsRequest,
      createdAt: new Date('2025-01-01T11:00:00.000Z'),
      statusDetails: {
        notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
        status: 'sending'
      }
    })

    const mockNotification = {
      id: mockRetryId,
      message: {
        ...mockCommsRequest,
        data: {
          ...mockCommsRequest.data,
          correlationId: '6ac51d8a-3488-4a17-ba35-b42381646317'
        }
      },
      createdAt: new Date('2025-01-07T11:00:00.000Z'),
      statusDetails: {
        notificationId: 'a22edfc0-5249-486e-a98f-0d9f8f4a9d7a',
        status: 'sending'
      }
    }

    await checkRetry(mockNotification, 'temporary-failure')

    expect(publishRetryRequest).not.toHaveBeenCalled()
  })

  test('should publish expiry event if retry window has expired', async () => {
    vi.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))

    const mockRetryId = '4832e930-276b-474d-b1ab-ff699ba5b1e0'

    getOriginalNotificationRequest.mockResolvedValue({
      message: mockCommsRequest,
      createdAt: new Date('2025-01-01T11:00:00.000Z'),
      statusDetails: {
        notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
        status: 'sending'
      }
    })

    const mockNotification = {
      id: mockRetryId,
      message: {
        ...mockCommsRequest,
        data: {
          ...mockCommsRequest.data,
          correlationId: '6ac51d8a-3488-4a17-ba35-b42381646317'
        }
      },
      createdAt: new Date('2025-01-01T10:59:00.000Z'),
      statusDetails: {
        notificationId: 'a22edfc0-5249-486e-a98f-0d9f8f4a9d7a',
        status: 'sending'
      }
    }

    await checkRetry(mockNotification, 'temporary-failure')

    expect(publishRetryExpired).toHaveBeenCalledWith(
      mockNotification.message,
      mockNotification.message.data.recipient
    )
  })

  afterAll(() => {
    vi.useRealTimers()
  })
})
