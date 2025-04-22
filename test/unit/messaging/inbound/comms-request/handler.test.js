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
})
