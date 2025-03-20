import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import v3CommsRequest from '../../../../../mocks/comms-request/v3.js'

const mockLoggerInfo = jest.fn()
const mockLoggerWarn = jest.fn()
const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    warn: (...args) => mockLoggerWarn(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

const mockAddNotificationRequest = jest.fn()
const mockCheckNotificationIdempotency = jest.fn().mockRejectedValue(false)
const mockTrySendViaNotify = jest.fn()

jest.unstable_mockModule('../../../../../../src/repos/notification-log.js', () => ({
  addNotificationRequest: mockAddNotificationRequest,
  checkNotificationIdempotency: mockCheckNotificationIdempotency
}))

jest.unstable_mockModule('../../../../../../src/messaging/inbound/comms-request/try-send-via-notify.js', () => ({
  trySendViaNotify: mockTrySendViaNotify
}))

const { processV3CommsRequest } = await import('../../../../../../src/messaging/inbound/comms-request/processors/v3.js')

describe('comms request v3 processor', () => {
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
    expect(mockTrySendViaNotify).toHaveBeenCalledWith(testMessage, 'test1@example.com')
    expect(mockTrySendViaNotify).toHaveBeenCalledWith(testMessage, 'test2@example.com')
  })

  test('should handle single email address correctly', async () => {
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
    expect(mockTrySendViaNotify).toHaveBeenCalledWith(testMessage, 'single@example.com')
  })
})
