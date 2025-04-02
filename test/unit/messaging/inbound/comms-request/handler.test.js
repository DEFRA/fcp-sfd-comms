import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import sqsMessage from '../../../../mocks/aws/sqs-message'

const mockLoggerInfo = jest.fn()
const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

const mockSendMessage = jest.fn()
const mockProcessor = jest.fn()

jest.unstable_mockModule('../../../../../src/messaging/inbound/comms-request/processors/processor.js', () => ({
  getCommsProcessor: jest.fn(() => mockProcessor)
}))

jest.unstable_mockModule('../../../../../src/messaging/inbound/sqs/send-message', () => ({
  sendMessage: mockSendMessage
}))

const { handleCommRequestMessages } = await import('../../../../../src/messaging/inbound/comms-request/handler.js')

describe('comms request handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
