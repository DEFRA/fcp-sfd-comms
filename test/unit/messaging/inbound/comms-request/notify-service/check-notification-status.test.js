import { vi, describe, test, expect, beforeEach } from 'vitest'

import mockCommsRequest from '../../../../../mocks/comms-request/v3.js'

import notifyClient from '../../../../../../src/notify/notify-client.js'

import { finishedStatus } from '../../../../../../src/constants/notify-statuses.js'

import { createLogger } from '../../../../../../src/logging/logger.js'
import { updateNotificationStatus } from '../../../../../../src/repos/notification-log.js'
import { checkNotificationStatus } from '../../../../../../src/messaging/inbound/comms-request/notify-service/check-notification-status.js'

vi.mock('../../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../../../../../../src/notify/notify-client.js', () => ({
  default: {
    getNotificationById: vi.fn()
  }
}))

vi.mock('../../../../../../src/repos/notification-log.js', () => ({
  updateNotificationStatus: vi.fn()
}))

vi.mock('../../../../../../src/config/index.js', () => ({
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

  test('should check notification status successfully', async () => {
    const mockStatus = finishedStatus[0]
    notifyClient.getNotificationById.mockResolvedValue({ data: { status: mockStatus } })
    const data = mockCommsRequest.data
    const notifyId = 'mock-notify-id'

    const status = await checkNotificationStatus(data.message, data.commsAddresses, notifyId)

    expect(notifyClient.getNotificationById).toHaveBeenCalledWith(notifyId)
    expect(updateNotificationStatus).toHaveBeenCalledWith(data.message, data.commsAddresses, mockStatus)
    expect(status).toEqual(mockStatus)
  })

  test('should retry notification status check until max attempts reached', async () => {
    notifyClient.getNotificationById.mockResolvedValue({ data: { status: 'sending' } })
    const data = mockCommsRequest.data
    const notifyId = 'mock-notify-id'

    await expect(checkNotificationStatus(data.message, data.commsAddresses, notifyId))
      .rejects.toThrow(`Status check for notification ${notifyId} timed out after 3 attempts`)

    expect(notifyClient.getNotificationById).toHaveBeenCalledTimes(3)
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('should log an error if checking notification status fails', async () => {
    const mockError = new Error('Failed to fetch status')
    notifyClient.getNotificationById.mockRejectedValue(mockError)
    const data = mockCommsRequest.data
    const notifyId = 'mock-notify-id'

    await expect(checkNotificationStatus(data.message, data.commsAddresses, notifyId))
      .rejects.toThrow(`Status check for notification ${notifyId} timed out after 3 attempts`)

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Failed checking notification ${notifyId}: Failed to fetch status`
    )
  })
})
