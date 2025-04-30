import { vi, beforeEach, describe, expect, test } from 'vitest'

import v1CommsRequest from '../../../../../../mocks/comms-request/v1.js'

import { createLogger } from '../../../../../../../src/logging/logger.js'

import { publishStatus } from '../../../../../../../src/messaging/outbound/notification-status/publish-status.js'
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

vi.mock('../../../../../../../src/services/notify-service/check-notification-status.js')
vi.mock('../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js')
vi.mock('../../../../../../../src/messaging/outbound/retry-expired/publish-expired.js')
vi.mock('../../../../../../../src/messaging/outbound/notification-status/publish-status.js')

describe('comms request v1 notify success', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should publish sending event', async () => {
    const mockMessage = {
      ...v1CommsRequest,
      data: {
        ...v1CommsRequest.data,
        recipient: 'test@example.com'
      }
    }

    const mockResponse = {
      status: 200,
      data: {
        id: '9b80b2ea-a663-4726-bd76-81d301a28b18'
      }
    }

    await processNotifySuccess(mockMessage, mockMessage.data.recipient, mockResponse)

    expect(publishStatus).toHaveBeenCalledTimes(1)
    expect(publishStatus).toHaveBeenCalledWith(
      mockMessage,
      mockMessage.data.recipient,
      'sending'
    )
  })

  test('should log error if publish status fails', async () => {
    const mockMessage = {
      ...v1CommsRequest,
      data: {
        ...v1CommsRequest.data,
        recipient: 'test@example.com'
      }
    }

    const mockResponse = {
      status: 200,
      data: {
        id: '9b80b2ea-a663-4726-bd76-81d301a28b18'
      }
    }

    publishStatus.mockRejectedValue(new Error('Publish status error'))

    await processNotifySuccess(mockMessage, mockMessage.data.recipient, mockResponse)

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed checking notification status: Publish status error'
    )
  })
})
