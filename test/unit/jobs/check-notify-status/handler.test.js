import { vi, describe, test, expect, beforeEach } from 'vitest'

import mockCommsRequest from '../../../mocks/comms-request/v1.js'

import notifyClient from '../../../../src/notify/notify-client.js'

import { createLogger } from '../../../../src/logging/logger.js'

import { getPendingNotifications, updateNotificationStatus } from '../../../../src/repos/notification-log.js'
import { publishStatus } from '../../../../src/messaging/outbound/notification-status/publish-status.js'
import { checkNotifyStatusHandler } from '../../../../src/jobs/check-notify-status/handler.js'

vi.mock('../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../../../../src/repos/notification-log.js', () => ({
  getPendingNotifications: vi.fn(),
  updateNotificationStatus: vi.fn(),
  getOriginalNotificationRequest: vi.fn()
}))

vi.mock('../../../../src/messaging/outbound/notification-status/publish-status.js')

vi.mock('../../../../src/notify/notify-client.js', () => ({
  default: {
    getNotificationById: vi.fn()
  }
}))

vi.mock('../../../../src/config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'notify.statusCheckMaxAttempts') return 3
      if (key === 'notify.statusCheckInterval') return 10
    })
  }
}))

const mockLogger = createLogger()

describe('Check notification status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should not check status if no pending notifications', async () => {
    getPendingNotifications.mockResolvedValue([])

    await checkNotifyStatusHandler()

    expect(notifyClient.getNotificationById).not.toHaveBeenCalled()
  })

  test('should get notify status for each pending notification', async () => {
    getPendingNotifications.mockResolvedValue([
      {
        message: mockCommsRequest,
        createdAt: new Date(),
        statusDetails: {
          notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
          status: 'sending'
        }
      },
      {
        message: mockCommsRequest,
        createdAt: new Date(),
        statusDetails: {
          notificationId: '65b2ca19-5450-48fe-911a-746bd80c5899',
          status: 'sending'
        }
      }
    ])

    notifyClient.getNotificationById.mockResolvedValue({
      data: {
        status: 'delivered'
      }
    })

    await checkNotifyStatusHandler()

    expect(notifyClient.getNotificationById).toHaveBeenCalledTimes(2)
    expect(notifyClient.getNotificationById).toHaveBeenCalledWith('9b80b2ea-a663-4726-bd76-81d301a28b18')
    expect(notifyClient.getNotificationById).toHaveBeenCalledWith('65b2ca19-5450-48fe-911a-746bd80c5899')
  })

  test('should update notification status if it has changed', async () => {
    const mockMessage = {
      ...mockCommsRequest,
      data: {
        ...mockCommsRequest.data,
        recipient: 'test@example.com'
      }
    }

    getPendingNotifications.mockResolvedValue([
      {
        message: mockMessage,
        createdAt: new Date(),
        statusDetails: {
          notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
          status: 'sending'
        }
      }
    ])

    notifyClient.getNotificationById.mockResolvedValue({
      data: {
        status: 'delivered'
      }
    })

    await checkNotifyStatusHandler()

    expect(updateNotificationStatus).toHaveBeenCalledTimes(1)
    expect(updateNotificationStatus).toHaveBeenCalledWith(
      mockMessage,
      {
        status: 'delivered'
      }
    )
  })

  test('should not update notification status if it has not changed', async () => {
    const mockMessage = {
      ...mockCommsRequest,
      data: {
        ...mockCommsRequest.data,
        recipient: 'test@example.com'
      }
    }

    getPendingNotifications.mockResolvedValue([
      {
        message: mockMessage,
        createdAt: new Date(),
        statusDetails: {
          notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
          status: 'sending'
        }
      }
    ])

    notifyClient.getNotificationById.mockResolvedValue({
      data: {
        status: 'sending'
      }
    })

    await checkNotifyStatusHandler()

    expect(updateNotificationStatus).not.toHaveBeenCalled()
  })

  test('should log number of updated notifications', async () => {
    getPendingNotifications.mockResolvedValue([
      {
        message: mockCommsRequest,
        createdAt: new Date(),
        statusDetails: {
          notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
          status: 'sending'
        }
      },
      {
        message: mockCommsRequest,
        createdAt: new Date(),
        statusDetails: {
          notificationId: '65b2ca19-5450-48fe-911a-746bd80c5899',
          status: 'sending'
        }
      }
    ])

    notifyClient.getNotificationById.mockResolvedValue({
      data: {
        status: 'delivered'
      }
    })

    await checkNotifyStatusHandler()

    expect(mockLogger.info).toHaveBeenCalledWith('Updated 2 notifications')
  })

  test('should not include skipped notifications in count', async () => {
    getPendingNotifications.mockResolvedValue([
      {
        message: mockCommsRequest,
        createdAt: new Date(),
        statusDetails: {
          notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
          status: 'sending'
        }
      },
      {
        message: mockCommsRequest,
        createdAt: new Date(),
        statusDetails: {
          notificationId: '65b2ca19-5450-48fe-911a-746bd80c5899',
          status: 'delivered'
        }
      }
    ])

    notifyClient.getNotificationById.mockResolvedValue({
      data: {
        status: 'delivered'
      }
    })

    await checkNotifyStatusHandler()

    expect(mockLogger.info).toHaveBeenCalledWith('Updated 1 notifications')
  })

  test('should log error if gov notify fetch fails', async () => {
    getPendingNotifications.mockResolvedValue([
      {
        message: mockCommsRequest,
        createdAt: new Date(),
        statusDetails: {
          notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
          status: 'sending'
        }
      }
    ])

    notifyClient.getNotificationById.mockRejectedValue(new Error('Failed to fetch status'))

    await checkNotifyStatusHandler()

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error checking notification: Failed to fetch status'
    )
  })

  describe('status event publishing', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    test.each([
      'delivered',
      'technical-failure',
      'permanent-failure',
      'temporary-failure',
      'internal-failure'
    ])('should call publish event if status has changed to %s', async (status) => {
      const mockMessage = {
        ...mockCommsRequest,
        data: {
          ...mockCommsRequest.data,
          recipient: 'test@example.com'
        }
      }

      getPendingNotifications.mockResolvedValue([
        {
          message: mockMessage,
          createdAt: new Date(),
          statusDetails: {
            notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
            status: 'sending'
          }
        }
      ])

      notifyClient.getNotificationById.mockResolvedValue({
        data: {
          status
        }
      })

      await checkNotifyStatusHandler()

      expect(publishStatus).toHaveBeenCalledWith(
        mockMessage,
        mockMessage.data.recipient,
        status
      )
    })

    test.each([
      'created',
      'sending'
    ])('should not call publish event if status has not changed to %s', async (status) => {
      const mockMessage = {
        ...mockCommsRequest,
        data: {
          ...mockCommsRequest.data,
          recipient: 'test@example.com'
        }
      }

      getPendingNotifications.mockResolvedValue([
        {
          message: mockMessage,
          createdAt: new Date(),
          statusDetails: {
            notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
            status: 'sending'
          }
        }
      ])

      notifyClient.getNotificationById.mockResolvedValue({
        data: {
          status
        }
      })

      await checkNotifyStatusHandler()

      expect(publishStatus).not.toHaveBeenCalled()
    })
  })
})
