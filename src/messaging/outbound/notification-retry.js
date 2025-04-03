import { SendMessageCommand } from '@aws-sdk/client-sqs'

import { config } from '../../config/index.js'
import { sqsClient } from '../sqs/client.js'
import { commsEvents } from '../../constants/comms-events.js'

const publishRetryRequest = async (message, recipient, delay) => {
  const retryMessage = {
    ...message,
    id: crypto.randomUUID(),
    type: commsEvents.RETRY,
    time: new Date(),
    data: {
      ...message.data,
      correlationId: message.data.correlationId ?? message.id,
      commsAddresses: recipient
    }
  }

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
