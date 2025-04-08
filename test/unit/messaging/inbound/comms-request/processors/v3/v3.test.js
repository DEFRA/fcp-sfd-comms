import { jest, describe, test, expect, beforeEach } from '@jest/globals'

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
const mockCheckNotificationIdempotency = jest.fn().mockRejectedValue(false)
const mockUpdateNotificationStatus = jest.fn()
const mockGetOriginalNotificationRequest = jest.fn()

jest.unstable_mockModule('../../../../../../../src/repos/notification-log.js', () => ({
  addNotificationRequest: mockAddNotificationRequest,
  checkNotificationIdempotency: mockCheckNotificationIdempotency,
  updateNotificationStatus: mockUpdateNotificationStatus,
  getOriginalNotificationRequest: mockGetOriginalNotificationRequest
}))

const mockTrySendViaNotify = jest.fn().mockResolvedValue([{}, null])

jest.unstable_mockModule('../../../../../../../src/messaging/inbound/comms-request/notify-service/try-send-via-notify.js', () => ({
  trySendViaNotify: mockTrySendViaNotify
}))

const mockCheckNotificationStatus = jest.fn()

jest.unstable_mockModule('../../../../../../../src/messaging/inbound/comms-request/notify-service/check-notification-status.js', () => ({
  checkNotificationStatus: mockCheckNotificationStatus
}))

const mockPublishRetryRequest = jest.fn()

jest.unstable_mockModule('../../../../../../../src/messaging/outbound/notification-retry.js', () => ({
  publishRetryRequest: mockPublishRetryRequest
}))

jest.unstable_mockModule('../../../../../../../src/messaging/outbound/received-request/publish-received.js', () => ({
  publishReceivedMessage: jest.fn()
}))

jest.unstable_mockModule('../../../../../../../src/messaging/outbound/invalid-request/publish-invalid.js', () => ({
  publishInvalidRequest: jest.fn()
}))

const { processV3CommsRequest } = await import('../../../../../../../src/messaging/inbound/comms-request/processors/v3/v3.js')

describe('comms request v3 processor', () => {
  describe('sending comms', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should process a valid comms message', async () => {
      mockCheckNotificationIdempotency.mockResolvedValue(false)

      await processV3CommsRequest(v3CommsRequest)

      expect(mockLoggerInfo).toHaveBeenCalledWith('Comms V3 request processed successfully, eventId: 79389915-7275-457a-b8ca-8bf206b2e67b')
    })

    test('should log error if message is invalid', async () => {
      await processV3CommsRequest({})

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Invalid comms V3 payload: "id" is required,"source" is required,"specversion" is required,"type" is required,"datacontenttype" is required,"time" is required,"data" is required'
      )
    })

    test('should process message if idempotency check passes', async () => {
      mockCheckNotificationIdempotency.mockResolvedValue(false)

      await processV3CommsRequest(v3CommsRequest)

      expect(mockLoggerInfo).toHaveBeenCalledWith('Comms V3 request processed successfully, eventId: 79389915-7275-457a-b8ca-8bf206b2e67b')
    })

    test('should process message if idempotency check fails', async () => {
      mockCheckNotificationIdempotency.mockResolvedValue(true)

      await processV3CommsRequest(v3CommsRequest)

      expect(mockLoggerWarn).toHaveBeenCalledWith('Comms V3 request already processed, eventId: 79389915-7275-457a-b8ca-8bf206b2e67b')
    })

    test('should call trySendViaNotify for each email address', async () => {
      mockCheckNotificationIdempotency.mockResolvedValue(false)

      const testMessage = {
        ...v3CommsRequest,
        data: {
          ...v3CommsRequest.data,
          commsAddresses: ['test1@example.com', 'test2@example.com']
        }
      }

      await processV3CommsRequest(testMessage)

      expect(mockTrySendViaNotify).toHaveBeenCalledTimes(2)
      expect(mockTrySendViaNotify).toHaveBeenCalledWith(testMessage.data.notifyTemplateId, 'test1@example.com', {
        personalisation: testMessage.data.personalisation,
        reference: testMessage.id,
        emailReplyToId: testMessage.data.emailReplyToId
      })

      expect(mockTrySendViaNotify).toHaveBeenCalledWith(testMessage.data.notifyTemplateId, 'test2@example.com', {
        personalisation: testMessage.data.personalisation,
        reference: testMessage.id,
        emailReplyToId: testMessage.data.emailReplyToId
      })
    })

    test('should handle single email address', async () => {
      mockCheckNotificationIdempotency.mockResolvedValue(false)

      const testMessage = {
        ...v3CommsRequest,
        data: {
          ...v3CommsRequest.data,
          commsAddresses: 'single@example.com'
        }
      }

      await processV3CommsRequest(testMessage)

      expect(mockTrySendViaNotify).toHaveBeenCalledTimes(1)
      expect(mockTrySendViaNotify).toHaveBeenCalledWith(testMessage.data.notifyTemplateId, 'single@example.com', {
        personalisation: testMessage.data.personalisation,
        reference: testMessage.id,
        emailReplyToId: testMessage.data.emailReplyToId
      })
    })
  })
})
