import { SendMessageCommand } from '@aws-sdk/client-sqs'

import { config } from '../../config/index.js'
import { sqsClient } from '../sqs/client.js'
import { commEvents } from '../../constants/comm-events.js'

const publishRetryRequest = async (message, recipient, delay) => {
  if (delay > 15) {
    throw new Error('Delay must be less than or equal to 15 minutes')
  }

  const retryMessage = {
    ...message,
    id: crypto.randomUUID(),
    type: commEvents.RETRY,
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

  await sqsClient.send(command)
}

export { publishRetryRequest }
