import { SendMessageCommand } from '@aws-sdk/client-sqs'

import { config } from '../../../config/index.js'
import { sqsClient } from '../../sqs/client.js'
import { buildRetryMessage } from './retry-message.js'

const publishRetryRequest = async (message, recipient, delay) => {
  const retryMessage = buildRetryMessage(message, recipient)

  const command = new SendMessageCommand({
    QueueUrl: config.get('messaging.commsRequest.queueUrl'),
    MessageBody: JSON.stringify(retryMessage),
    DelaySeconds: delay * 60
  })

  try {
    await sqsClient.send(command)
  } catch (err) {
    throw new Error(`Error publishing retry message: ${err.message}`, {
      cause: err
    })
  }
}

export { publishRetryRequest }
