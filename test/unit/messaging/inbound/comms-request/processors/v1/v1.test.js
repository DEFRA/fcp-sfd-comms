import { vi, describe, test, expect, beforeEach } from 'vitest'

import v1CommsRequest from '../../../../../../mocks/comms-request/v1.js'

import { createLogger } from '../../../../../../../src/logging/logger.js'

import { checkNotificationIdempotency } from '../../../../../../../src/repos/notification-log.js'
import { processNotifySuccess } from '../../../../../../../src/messaging/inbound/comms-request/processors/v1/process-notify-success.js'
import { processNotifyError } from '../../../../../../../src/messaging/inbound/comms-request/processors/v1/process-notify-error.js'
import { trySendViaNotify } from '../../../../../../../src/services/notify-service/try-send-via-notify.js'
import { processV1CommsRequest } from '../../../../../../../src/messaging/inbound/comms-request/processors/v1/v1.js'

vi.mock('../../../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../../../../../../../src/repos/notification-log.js')

vi.mock('../../../../../../../src/services/notify-service/try-send-via-notify.js')
vi.mock('../../../../../../../src/messaging/inbound/comms-request/notify-service/check-notification-status.js')
vi.mock('../../../../../../../src/messaging/inbound/comms-request/processors/v1/process-notify-success.js')
vi.mock('../../../../../../../src/messaging/inbound/comms-request/processors/v1/process-notify-error.js')

vi.mock('../../../../../../../src/messaging/outbound/notification-retry/notification-retry.js')
vi.mock('../../../../../../../src/messaging/outbound/received-request/publish-received.js')
vi.mock('../../../../../../../src/messaging/outbound/invalid-request/publish-invalid.js')

const mockLogger = createLogger()

describe('comms request v1 processor', () => {
  describe('sending comms', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    test('should process a valid comms message', async () => {
      trySendViaNotify.mockResolvedValue([{}, null])

      checkNotificationIdempotency.mockResolvedValue(false)

      await processV1CommsRequest(v1CommsRequest)

      expect(mockLogger.info).toHaveBeenCalledWith('Comms V1 request processed successfully, eventId: 79389915-7275-457a-b8ca-8bf206b2e67b')
    })

    test('should log error if message is invalid', async () => {
      await processV1CommsRequest({})

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid comms V1 payload: "id" is required,"source" is required,"specversion" is required,"type" is required,"datacontenttype" is required,"time" is required,"data" is required'
      )
    })

    test('should process message if idempotency check passes', async () => {
      trySendViaNotify.mockResolvedValue([{}, null])

      checkNotificationIdempotency.mockResolvedValue(false)

      await processV1CommsRequest(v1CommsRequest)

      expect(mockLogger.info).toHaveBeenCalledWith('Comms V1 request processed successfully, eventId: 79389915-7275-457a-b8ca-8bf206b2e67b')
    })

    test('should process message if idempotency check fails', async () => {
      checkNotificationIdempotency.mockResolvedValue(true)

      await processV1CommsRequest(v1CommsRequest)

      expect(mockLogger.warn).toHaveBeenCalledWith('Comms V1 request already processed, eventId: 79389915-7275-457a-b8ca-8bf206b2e67b')
    })

    test('should call notify with email address', async () => {
      trySendViaNotify.mockResolvedValue([{}, null])

      checkNotificationIdempotency.mockResolvedValue(false)

      const testMessage = {
        ...v1CommsRequest,
        data: {
          ...v1CommsRequest.data,
          recipient: 'single@example.com'
        }
      }

      await processV1CommsRequest(testMessage)

      expect(trySendViaNotify).toHaveBeenCalledTimes(1)
      expect(trySendViaNotify).toHaveBeenCalledWith(testMessage.data.notifyTemplateId, 'single@example.com', {
        personalisation: testMessage.data.personalisation,
        reference: testMessage.id,
        emailReplyToId: testMessage.data.emailReplyToId
      })
    })

    test('valid response from GOV Notify should proccess success', async () => {
      const mockResponse = {
        data: {
          id: 'mock-response-id'
        }
      }

      const testMessage = {
        ...v1CommsRequest,
        data: {
          ...v1CommsRequest.data,
          recipient: 'single@example.com'
        }
      }

      trySendViaNotify.mockReturnValue([mockResponse, null])

      await processV1CommsRequest(testMessage)

      expect(processNotifySuccess).toHaveBeenCalledWith(testMessage, 'single@example.com', mockResponse)
      expect(processNotifyError).not.toHaveBeenCalled()
    })

    test('error response from GOV Notify should process error', async () => {
      const mockError = {
        status: 500,
        data: {
          error: {
            status_code: 500,
            errors: [
              {
                error: 'Internal server error'
              }
            ]
          }
        }
      }

      const testMessage = {
        ...v1CommsRequest,
        data: {
          ...v1CommsRequest.data,
          recipient: 'single@example.com'
        }
      }

      trySendViaNotify.mockReturnValue([null, mockError])

      await processV1CommsRequest(testMessage)

      expect(processNotifyError).toHaveBeenCalledWith(testMessage, 'single@example.com', mockError)
      expect(processNotifySuccess).not.toHaveBeenCalled()
    })
  })
})
