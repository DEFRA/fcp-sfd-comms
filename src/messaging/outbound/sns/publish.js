import { PublishCommand } from '@aws-sdk/client-sns'

const publish = async (snsClient, topicArn, message) => {
  const command = new PublishCommand({
    TopicArn: topicArn,
    Message: message
  })

  await snsClient.send(command)
}

export { publish }
