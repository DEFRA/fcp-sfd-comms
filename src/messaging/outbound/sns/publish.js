import { PublishCommand } from '@aws-sdk/client-sns'

const publish = async (snsClient, topicArn, message) => {
  const isFifo = topicArn.endsWith('.fifo')

  const params = {
    TopicArn: topicArn,
    Message: message
  }

  if (isFifo) {
    params.MessageGroupId = message.id || 'default-message-group-id'
    params.MessageDeduplicationId = message.id || 'default-message-deduplication-id'
  }

  const command = new PublishCommand(params)

  await snsClient.send((command))
}

export { publish }
