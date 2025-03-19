import { createLogger } from '../../../logging/logger.js'

import { getCommsProcessor } from './processors/processor.js'

import { parseSqsMessage } from '../../sqs/parse-message.js'

import { sendNotification } from './send-notification.js'

const logger = createLogger()

const handleCommRequestMessages = async (messages) => {
  const completed = []

  for (const message of messages) {
    try {
      const content = parseSqsMessage(message)

      const processor = getCommsProcessor(content)

      await processor(content)

      await sendNotification(message)
    } catch (err) {
      logger.error(`Error processing message: ${err.message}`)
    }

    completed.push(message)
  }

  return completed
}

export { handleCommRequestMessages }
