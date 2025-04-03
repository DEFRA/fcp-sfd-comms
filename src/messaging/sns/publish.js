import { PublishCommand } from '@aws-sdk/client-sns'

const publish = async (snsClient, topicArn, message) => {
  const isFifo = topicArn.endsWith('.fifo')

  const params = {
    TopicArn: topicArn,
    Message: JSON.stringify(message)
  }

  if (isFifo) {
    params.MessageGroupId = message.data?.correlationId ?? message.id
    params.MessageDeduplicationId = message.id
  }

  const command = new PublishCommand(params)

  await snsClient.send(command)
}

export { publish }
