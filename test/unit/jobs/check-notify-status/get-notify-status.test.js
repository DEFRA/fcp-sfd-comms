import { vi, describe, test, expect, beforeEach } from 'vitest'

import notifyClient from '../../../../src/notify/notify-client.js'

import { getNotifyStatus } from '../../../../src/jobs/check-notify-status/get-notify-status.js'

vi.mock('../../../../src/notify/notify-client.js', () => ({
  default: {
    getNotificationById: vi.fn()
  }
}))

describe('Get status from notify API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should call notify API with notification ID', async () => {
    notifyClient.getNotificationById.mockResolvedValue({
      data: {
        id: '3da604f4-fad9-4ed0-a99f-1e3c7bca8170',
        status: 'delivered'
      }
    })

    await getNotifyStatus('3da604f4-fad9-4ed0-a99f-1e3c7bca8170')

    expect(notifyClient.getNotificationById).toHaveBeenCalledWith('3da604f4-fad9-4ed0-a99f-1e3c7bca8170')
  })

  test('should return status from notify API', async () => {
    notifyClient.getNotificationById.mockResolvedValue({
      data: {
        id: '3da604f4-fad9-4ed0-a99f-1e3c7bca8170',
        status: 'delivered'
      }
    })

    const status = await getNotifyStatus('3da604f4-fad9-4ed0-a99f-1e3c7bca8170')

    expect(status).toBe('delivered')
  })
})
