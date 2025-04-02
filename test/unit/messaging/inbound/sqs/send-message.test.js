import { beforeEach, describe, expect, jest, test } from '@jest/globals'

const mockSqsClient = {
  send: jest.fn()
}

const mockSendMessageCommand = jest.fn()

jest.unstable_mockModule('@aws-sdk/client-sqs', () => ({
  SendMessageCommand: mockSendMessageCommand
}))

const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

const { sendMessage } = await import('../../../../../src/messaging/inbound/sqs/send-message.js')

describe('sqs send message', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
  })

  test('should create and execute send message command', async () => {
    const message = JSON.stringify({
      test: 'hello world'
    })

    await sendMessage(
      mockSqsClient,
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      message
    )

    expect(mockSendMessageCommand).toHaveBeenCalledWith({
      QueueUrl: 'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      MessageBody: message
    })

    expect(mockSqsClient.send).toHaveBeenCalledTimes(1)
  })
})
