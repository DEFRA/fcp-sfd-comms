import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import sqsMessage from '../../../../mocks/aws/sqs-message'

import { UnprocessableMessageError } from '../../../../../src/errors/message-errors.js'

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

jest.unstable_mockModule('../../../../../src/messaging/sqs/send-message', () => ({
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

    const completed = await handleCommRequestMessages({}, messages)

    expect(completed).toHaveLength(1)
    expect(completed).toContain(sqsMessage)
  })

  test('should dead letter messages that throw unprocessable message', async () => {
    const messages = [
      sqsMessage
    ]

    mockProcessor.mockRejectedValue(new UnprocessableMessageError('Invalid message'))

    const completed = await handleCommRequestMessages({}, messages)

    expect(mockLoggerInfo).toHaveBeenCalledWith('Moving unprocessable message to dead letter queue')
    expect(mockSendMessage).toHaveBeenCalledWith(
      {},
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request-deadletter',
      sqsMessage.Body
    )
    expect(completed).toHaveLength(1)
  })

  test('should dead letter messages that throw error', async () => {
    const messages = [
      sqsMessage
    ]

    mockProcessor.mockRejectedValue(new Error('Error connecting to database'))

    const completed = await handleCommRequestMessages({}, messages)

    expect(completed).toHaveLength(1)
  })
})
