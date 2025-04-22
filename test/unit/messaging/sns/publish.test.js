import { beforeEach, describe, expect, vi, test } from 'vitest'

import { PublishCommand } from '@aws-sdk/client-sns'
import { publish } from '../../../../src/messaging/sns/publish.js'

const mockSnsClient = {
  send: vi.fn()
}

vi.mock('@aws-sdk/client-sns')

const mockLoggerError = vi.fn()

vi.mock('../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

describe('SNS Publish', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  test('should receive and execute publish command if SNS topic is FiFo', async () => {
    const topicArn = 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo'

    const message = {
      test: 'hello world',
      id: '149C5ACA-C971-45BA-8D94-9664A91B5471'
    }

    await publish(mockSnsClient, topicArn, message)

    expect(PublishCommand).toHaveBeenCalledWith({
      TopicArn: 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      Message: JSON.stringify(message),
      MessageGroupId: message.id,
      MessageDeduplicationId: message.id
    })

    expect(mockSnsClient.send).toHaveBeenCalledTimes(1)
  })

  test('should receive and execute publish command if SNS topic is not FiFo', async () => {
    const topicArn = 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data'

    const message = {
      test: 'hello world',
      id: '149C5ACA-C971-45BA-8D94-9664A91B5471'
    }

    await publish(mockSnsClient, topicArn, message)

    expect(PublishCommand).toHaveBeenCalledWith({
      TopicArn: 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data',
      Message: JSON.stringify(message)
    })

    expect(mockSnsClient.send).toHaveBeenCalledTimes(1)
  })
})
