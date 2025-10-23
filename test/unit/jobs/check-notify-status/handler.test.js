import { vi, describe, test, expect, beforeEach } from 'vitest'

import mockCommsRequest from '../../../mocks/comms-request/v1.js'

import { createLogger } from '../../../../src/logging/logger.js'

import { getPendingNotifications, updateNotificationStatus } from '../../../../src/repos/notification-log.js'
import { getNotifyResult } from '../../../../src/jobs/check-notify-status/get-notify-result.js'
import { publishStatus } from '../../../../src/messaging/outbound/notification-status/publish-status.js'
import { checkRetry } from '../../../../src/jobs/check-notify-status/check-retry.js'
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
vi.mock('../../../../src/jobs/check-notify-status/check-retry.js')
vi.mock('../../../../src/jobs/check-notify-status/get-notify-result.js')

const mockLogger = createLogger()
const mockContent = 
      {
        subject: 'Subject line from notification',
        body: '# Body for notification in markdown'
      }

describe('Check notification status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('status checks', () => {
    test('should not check status if no pending notifications', async () => {
      getPendingNotifications.mockResolvedValue([])

      await checkNotifyStatusHandler()

      expect(getNotifyResult).not.toHaveBeenCalled()
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

      getNotifyResult.mockResolvedValue({
        status: 'delivered',
        content: mockContent
      })

      await checkNotifyStatusHandler()

      expect(getNotifyResult).toHaveBeenCalledTimes(2)
      expect(getNotifyResult).toHaveBeenCalledWith('9b80b2ea-a663-4726-bd76-81d301a28b18')
      expect(getNotifyResult).toHaveBeenCalledWith('65b2ca19-5450-48fe-911a-746bd80c5899')
    })

    test('should log error if get pending notifications fails', async () => {
      const mockError = new Error('Database error')

      getPendingNotifications.mockRejectedValue(mockError)

      await checkNotifyStatusHandler()

      expect(mockLogger.error).toHaveBeenCalledWith(
        mockError,
        'Error checking pending notifications'
      )
    })

    test('should not log info if no pending notifications', async () => {
      getPendingNotifications.mockResolvedValue([])

      await checkNotifyStatusHandler()

      expect(mockLogger.info).not.toHaveBeenCalled()
    })
  })

  describe('db status updates', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    test('should update notification status if it has changed', async () => {
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

      getNotifyResult.mockResolvedValue({
        status: 'delivered',
        content: mockContent
      })

      await checkNotifyStatusHandler()

      expect(updateNotificationStatus).toHaveBeenCalledTimes(1)
      expect(updateNotificationStatus).toHaveBeenCalledWith(
        mockCommsRequest,
        {
          status: 'delivered'
        }
      )
    })

    test('should not update notification status if it has not changed', async () => {
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

      getNotifyResult.mockResolvedValue({
        status: 'sending',
        content: mockContent
      })

      await checkNotifyStatusHandler()

      expect(updateNotificationStatus).not.toHaveBeenCalled()
    })
  })

  describe('update count logging', () => {
    beforeEach(() => {
      vi.clearAllMocks()
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

      getNotifyResult.mockResolvedValue({
        status: 'delivered',
        content: mockContent
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

      getNotifyResult.mockResolvedValue({
        status: 'delivered',
        content: mockContent
      })

      await checkNotifyStatusHandler()

      expect(mockLogger.info).toHaveBeenCalledWith('Updated 1 notifications')
    })
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

    const mockError = new Error('Failed to fetch status')

    getNotifyResult.mockRejectedValue(mockError)

    await checkNotifyStatusHandler()

    expect(mockLogger.error).toHaveBeenCalledWith(
      mockError,
      'Error checking notification 9b80b2ea-a663-4726-bd76-81d301a28b18'
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

      getNotifyResult.mockResolvedValue({
        status,
        content: mockContent   
      })

      await checkNotifyStatusHandler()

      expect(publishStatus).toHaveBeenCalledWith(
        mockCommsRequest,
        mockCommsRequest.data.recipient,
        status,
        mockContent
      )
    })

    test.each([
      'created',
      'sending'
    ])('should not call publish event if status has not changed to %s', async (status) => {
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

      getNotifyResult.mockResolvedValue({
        status,
        content: mockContent
      })

      await checkNotifyStatusHandler()

      expect(publishStatus).not.toHaveBeenCalled()
    })
  })

  describe('retry triggers', () => {
    test.each([
      'technical-failure',
      'temporary-failure'
    ])('should check for possible retry if status is %s', async (status) => {
      const createdAt = new Date()

      const mockNotification = {
        message: mockCommsRequest,
        createdAt,
        statusDetails: {
          notificationId: '9b80b2ea-a663-4726-bd76-81d301a28b18',
          status: 'sending'
        }
      }

      getPendingNotifications.mockResolvedValue([mockNotification])

      getNotifyResult.mockResolvedValue({
        status,
        content: mockContent
      })

      await checkNotifyStatusHandler()

      expect(checkRetry).toHaveBeenCalledOnce()
      expect(checkRetry).toHaveBeenCalledWith(mockNotification, status)
    })

    test.each([
      'created',
      'sending',
      'delivered',
      'permanent-failure',
      'internal-failure'
    ])('should not check for possible retry if status is %s', async (status) => {
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

      getNotifyResult.mockResolvedValue({
        status,
        content: mockContent
      })

      await checkNotifyStatusHandler()

      expect(checkRetry).not.toHaveBeenCalled()
    })
  })
})
