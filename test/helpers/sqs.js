import { GetQueueAttributesCommand, PurgeQueueCommand, SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const sqsClient = new SQSClient({
  endpoint: process.env.SQS_ENDPOINT,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

const getQueueSize = async (queueUrl) => {
  const command = new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: [
      'ApproximateNumberOfMessages',
      'ApproximateNumberOfMessagesDelayed',
      'ApproximateNumberOfMessagesNotVisible'
    ]
  })

  const { Attributes: attributes } = await sqsClient.send(command)

  return {
    available: +attributes.ApproximateNumberOfMessages,
    delayed: +attributes.ApproximateNumberOfMessagesDelayed,
    notVisible: +attributes.ApproximateNumberOfMessagesNotVisible
  }
}

const resetQueue = async (queueUrl) => {
  const command = new PurgeQueueCommand({
    QueueUrl: queueUrl
  })

  await sqsClient.send(command)
}

const sendMessage = async (queueUrl, message) => {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: message
  })

  await sqsClient.send(command)
}

export { getQueueSize, resetQueue, sendMessage }
