import { vi, describe, test, expect, beforeEach } from 'vitest'

import notifyClient from '../../../../src/notify/notify-client.js'

import { getNotifyResponse } from '../../../../src/jobs/check-notify-status/get-notify-response.js'

vi.mock('../../../../src/notify/notify-client.js', () => ({
  default: {
    getNotificationById: vi.fn()
  }
}))

const notificationId = '3da604f4-fad9-4ed0-a99f-1e3c7bca8170'

describe('Get status from notify API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('When notify returns successfully', async () => {
    const mockNotifyResponse = {
      data: {
        id: notificationId,
        status: 'delivered',
        subject: 'Your application has been successful',
        body: '# This is the body of the email written in markdown'
      }
    }

    notifyClient.getNotificationById.mockResolvedValue(mockNotifyResponse)

    test('should call notify API with notification ID', async () => {
      await getNotifyResponse(notificationId)

      expect(notifyClient.getNotificationById).toHaveBeenCalledWith(notificationId)
    })

    test('should return status from notify API', async () => {
      const result = await getNotifyResponse(notificationId)

      expect(result.status).toBe(mockNotifyResponse.data.status)
    })

    test('should return subject from notify API', async () => {
      const result = await getNotifyResponse(notificationId)

      expect(result.content.subject).toBe(mockNotifyResponse.data.subject)
    })

    test('should return body from notify API', async () => {
      const result = await getNotifyResponse(notificationId)

      expect(result.content.body).toBe(mockNotifyResponse.data.body)
    })
  })

  describe('When notify returns an error', () => {
    test('should wrap error on notify API failure', async () => {
      notifyClient.getNotificationById.mockRejectedValue(new Error('Notify API error'))

      await expect(getNotifyResponse(notificationId)).rejects.toThrow(
        'Error getting status from GOV Notify for 3da604f4-fad9-4ed0-a99f-1e3c7bca8170: Notify API error'
      )
    })

    test('should wrap error if notify error contains single error', async () => {
      const mockNotifyError = {
        status: 400,
        data: {
          errors: [
            {
              message: 'Invalid notification ID'
            }
          ]
        }
      }

      const mockError = new Error('Notify API error')

      mockError.response = mockNotifyError
      notifyClient.getNotificationById.mockRejectedValue(mockError)

      await expect(getNotifyResponse(notificationId)).rejects.toThrow(
        'Error getting status from GOV Notify for 3da604f4-fad9-4ed0-a99f-1e3c7bca8170. Status code: 400, Message: Invalid notification ID'
      )
    })

    test('should wrap error if notify error contains multiple errors', async () => {
      const mockNotifyError = {
        status: 400,
        data: {
          errors: [
            {
              message: 'Invalid notification ID'
            },
            {
              message: 'Missing API key'
            }
          ]
        }
      }

      const mockError = new Error('Notify API error')

      mockError.response = mockNotifyError
      notifyClient.getNotificationById.mockRejectedValue(mockError)

      await expect(getNotifyResponse(notificationId)).rejects.toThrow(
        'Error getting status from GOV Notify for 3da604f4-fad9-4ed0-a99f-1e3c7bca8170. Status code: 400, Message: Invalid notification ID, Missing API key'
      )
    })
  })
})
