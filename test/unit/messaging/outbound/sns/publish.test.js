import { beforeEach, describe, expect, jest, test } from '@jest/globals'

const mockSnsClient = {
  send: jest.fn()
}

const mockPublishCommand = jest.fn()
const mockLoggerError = jest.fn()

jest.unstable_mockModule('@aws-sdk/client-sns', () => ({
  PublishCommand: mockPublishCommand
}))

jest.unstable_mockModule('../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

const { publish } = await import('../../../../../src/messaging/outbound/sns/publish.js')

describe('SNS Publish', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
  })

  test('should receive and execute publish command if SNS topic is FiFo', async () => {
    const topicArn = 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo'

    const message = JSON.stringify({
      test: 'hello world'
    })

    await publish(mockSnsClient, topicArn, message)

    expect(mockPublishCommand).toHaveBeenCalledWith({
      TopicArn: 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      Message: message,
      MessageGroupId: 'default-message-group-id',
      MessageDeduplicationId: 'default-message-deduplication-id'
    })

    expect(mockSnsClient.send).toHaveBeenCalledTimes(1)
  })

  test('should receive and execute publish command if SNS topic is not FiFo', async () => {
    const topicArn = 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data'

    const message = JSON.stringify({
      test: 'hello world'
    })

    await publish(mockSnsClient, topicArn, message)

    expect(mockPublishCommand).toHaveBeenCalledWith({
      TopicArn: 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data',
      Message: message
    })

    expect(mockSnsClient.send).toHaveBeenCalledTimes(1)
  })
})
