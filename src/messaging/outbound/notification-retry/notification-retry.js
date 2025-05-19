import { SendMessageCommand } from '@aws-sdk/client-sqs'
import { createLogger } from '../../../logging/logger.js'
import { config } from '../../../config/index.js'
import { sqsClient } from '../../sqs/client.js'
import { buildRetryMessage } from './retry-message.js'

const logger = createLogger()

const publishRetryRequest = async (message, recipient, delay, retryId) => {
  const retryMessage = buildRetryMessage(message, recipient, retryId)

  const command = new SendMessageCommand({
    QueueUrl: config.get('messaging.commsRequest.queueUrl'),
    MessageBody: JSON.stringify(retryMessage),
    DelaySeconds: delay * 60
  })

  try {
    await sqsClient.send(command)
  } catch (error) {
    logger.error(`Error publishing retry message: ${error.message}`, { cause: error })
  }
}

export { publishRetryRequest }
