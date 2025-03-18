import { config } from '../../../config/index.js'

import { createLogger } from '../../../logging/logger.js'

import { getCommsProcessor } from './processors/processor.js'

import { sendMessage } from '../../sqs/send-message.js'
import { parseSqsMessage } from '../../sqs/parse-message.js'

const logger = createLogger()

const handleMessage = async (sqsClient, message) => {
  try {
    const content = parseSqsMessage(message)

    const processor = getCommsProcessor(content)

    await processor(content)
  } catch (err) {
    logger.error(`Error processing message: ${err.message}`)
    logger.info('Moving unprocessable message to dead letter queue')

    await sendMessage(
      sqsClient,
      config.get('messaging.commsRequest.deadLetterUrl'),
      message?.Body
    )
  }
}

const handleCommRequestMessages = async (sqsClient, messages) => {
  const completed = []

  for (const message of messages) {
    try {
      await handleMessage(sqsClient, message)
    } catch (err) {
      logger.error(`Error handling message error: ${err}`)
    }

    completed.push(message)
  }

  return completed
}

export { handleCommRequestMessages }
