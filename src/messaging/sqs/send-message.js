import { SendMessageCommand } from '@aws-sdk/client-sqs'

const sendMessage = async (sqsClient, queueUrl, message) => {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: message
  })

  await sqsClient.send(command)
}

export { sendMessage }
