import { beforeEach, describe, expect, vi, test } from 'vitest'

import { SendMessageCommand } from '@aws-sdk/client-sqs'

const mockSqsClient = {
  send: vi.fn()
}

vi.mock('@aws-sdk/client-sqs')

const mockLoggerError = vi.fn()

vi.mock('../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

const { sendMessage } = await import('../../../../src/messaging/sqs/send-message.js')

describe('sqs send message', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
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

    expect(SendMessageCommand).toHaveBeenCalledWith({
      QueueUrl: 'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      MessageBody: message
    })

    expect(mockSqsClient.send).toHaveBeenCalledTimes(1)
  })
})
