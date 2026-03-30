import { vi, describe, test, expect, beforeEach } from 'vitest'

import sqsMessage from '../../../../mocks/aws/sqs-message'

import { handleCommRequestMessages } from '../../../../../src/messaging/inbound/comms-request/handler.js'

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

const mockRunWithCorrelationId = vi.fn((correlationId, fn) => fn())

vi.mock('../../../../../src/logging/correlation-id-store.js', () => ({
  runWithCorrelationId: (...args) => mockRunWithCorrelationId(...args)
}))

const mockProcessor = vi.fn()

vi.mock('../../../../../src/messaging/inbound/comms-request/processors/processor.js', () => ({
  getCommsProcessor: vi.fn(() => mockProcessor)
}))

vi.mock('../../../../../src/messaging/sqs/send-message.js')

describe('comms request handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should return completed messages', async () => {
    const messages = [
      sqsMessage
    ]

    const completed = await handleCommRequestMessages(messages)

    expect(completed).toHaveLength(1)
    expect(completed).toContain(sqsMessage)
  })

  test('should complete messages that throw error', async () => {
    const messages = [
      sqsMessage
    ]

    mockProcessor.mockRejectedValue(new Error('Error connecting to database'))

    const completed = await handleCommRequestMessages(messages)

    expect(completed).toHaveLength(1)
  })

  test('should call runWithCorrelationId with message id when correlationId is absent', async () => {
    const messages = [
      sqsMessage
    ]

    await handleCommRequestMessages(messages)

    expect(mockRunWithCorrelationId).toHaveBeenCalledWith(
      '79389915-7275-457a-b8ca-8bf206b2e67b',
      expect.any(Function)
    )
  })

  test('should call runWithCorrelationId with correlationId when present', async () => {
    const messageWithCorrelationId = {
      ...sqsMessage,
      Body: JSON.stringify({
        id: '79389915-7275-457a-b8ca-8bf206b2e67b',
        source: 'source-system',
        specversion: '1.0',
        type: 'uk.gov.fcp.sfd.notification.request',
        datacontenttype: 'application/json',
        time: '2023-10-17T14:48:00.000Z',
        data: {
          correlationId: '15df79e7-806e-4c85-9372-a2e256a1d597',
          crn: 1234567890,
          sbi: 123456789,
          sourceSystem: 'source',
          notifyTemplateId: 'd29257ce-974f-4214-8bbe-69ce5f2bb7f3',
          commsType: 'email',
          recipient: 'test@example.com',
          personalisation: { reference: 'test-reference' },
          reference: 'email-reference',
          emailReplyToId: 'f824cbfa-f75c-40bb-8407-8edb0cc469d3'
        }
      })
    }

    await handleCommRequestMessages([messageWithCorrelationId])

    expect(mockRunWithCorrelationId).toHaveBeenCalledWith(
      '15df79e7-806e-4c85-9372-a2e256a1d597',
      expect.any(Function)
    )
  })
})
