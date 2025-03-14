import { config } from '../../../config/index.js'

import { createLogger } from '../../../logging/logger.js'

import { getCommsProcessor } from './processors/processor.js'

import { sendMessage } from '../../sqs/send-message.js'
import { parseSqsMessage } from '../../sqs/parse-message.js'

const logger = createLogger()

const handleCommRequestMessages = async (sqsClient, messages) => {
  const completed = []

  for (const message of messages) {
    try {
      const content = parseSqsMessage(message)

      const processor = getCommsProcessor(content)

      await processor(content)

      completed.push(message)
    } catch (err) {
      logger.error(`Error processing message: ${err.message}`)
      logger.info('Moving unprocessable message to dead letter queue')

      completed.push(message)

      await sendMessage(
        sqsClient,
        config.get('messaging.commsRequest.deadLetterUrl'),
        message?.Body
      )
    }
  }

  return completed
}

export { handleCommRequestMessages }
