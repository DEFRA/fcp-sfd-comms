import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import v3CommsRequest from '../../../../../mocks/comms-request/v3.js'

const mockLoggerInfo = jest.fn()
const mockLoggerWarn = jest.fn()
const mockLoggerError = jest.fn()
const mockAddNotificationRequest = jest.fn()
const mockCheckNotificationIdempotency = jest.fn().mockRejectedValue(false)
const mockUpdateNotificationStatus = jest.fn()
const mockTrySendViaNotify = jest.fn().mockResolvedValue([{}, null])
const mockCheckNotificationStatus = jest.fn()

jest.unstable_mockModule('../../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    warn: (...args) => mockLoggerWarn(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

jest.unstable_mockModule('../../../../../../src/repos/notification-log.js', () => ({
  addNotificationRequest: mockAddNotificationRequest,
  checkNotificationIdempotency: mockCheckNotificationIdempotency,
  updateNotificationStatus: mockUpdateNotificationStatus
}))

jest.unstable_mockModule('../../../../../../src/messaging/inbound/comms-request/notify-service.js', () => ({
  trySendViaNotify: mockTrySendViaNotify,
  checkNotificationStatus: mockCheckNotificationStatus
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
    expect(mockTrySendViaNotify).toHaveBeenCalledWith('d29257ce-974f-4214-8bbe-69ce5f2bb7f3', 'test1@example.com', {
      personalisation: {
        reference: 'test-reference'
      },
      reference: '79389915-7275-457a-b8ca-8bf206b2e67b',
      emailReplyToId: 'f824cbfa-f75c-40bb-8407-8edb0cc469d3'
    })

    expect(mockTrySendViaNotify).toHaveBeenCalledWith('d29257ce-974f-4214-8bbe-69ce5f2bb7f3', 'test2@example.com', {
      personalisation: {
        reference: 'test-reference'
      },
      reference: '79389915-7275-457a-b8ca-8bf206b2e67b',
      emailReplyToId: 'f824cbfa-f75c-40bb-8407-8edb0cc469d3'
    })
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
    expect(mockTrySendViaNotify).toHaveBeenCalledWith('d29257ce-974f-4214-8bbe-69ce5f2bb7f3', 'single@example.com', {
      personalisation: {
        reference: 'test-reference'
      },
      reference: '79389915-7275-457a-b8ca-8bf206b2e67b',
      emailReplyToId: 'f824cbfa-f75c-40bb-8407-8edb0cc469d3'
    })
  })

  test('should handle failed status check and log error', async () => {
    const mockResponse = {
      data: {
        id: 'mock-response-id'
      }
    }

    mockTrySendViaNotify.mockResolvedValue([mockResponse])
    mockCheckNotificationStatus.mockRejectedValue(new Error('Update failed'))

    await processV3CommsRequest(v3CommsRequest)

    expect(mockLoggerError).toHaveBeenCalledWith(expect.stringMatching(/Failed checking notification/))
  })

  test('should update notification status to INTERNAL_FAILURE if request fails', async () => {
    const mockError = {
      status: 400,
      data: {
        error: {
          status_code: 400,
          errors: [
            {
              error: 'mock-error'
            }
          ]
        }
      }
    }

    mockTrySendViaNotify.mockResolvedValue([null, mockError])

    await processV3CommsRequest(v3CommsRequest)

    expect(mockUpdateNotificationStatus).toHaveBeenCalledWith(v3CommsRequest, expect.any(String), 'internal-failure', mockError.data.error)
  })

  test('should handle checkNotificationStatus failure and log error', async () => {
    mockTrySendViaNotify.mockResolvedValue([{ data: { id: 'mock-response-id' } }])
    mockCheckNotificationStatus.mockRejectedValue(new Error('Status check failed'))

    await processV3CommsRequest(v3CommsRequest)

    expect(mockLoggerError).toHaveBeenCalledWith(expect.stringMatching(/Failed checking notification status/))
  })
})
