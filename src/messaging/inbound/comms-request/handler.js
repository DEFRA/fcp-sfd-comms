import { createLogger } from '../../../logging/logger.js'

import { getCommsProcessor } from './processors/processor.js'

import { parseSqsMessage } from '../../sqs/parse-message.js'

const logger = createLogger()

const handleCommRequestMessages = async (messages) => {
  const completed = []

  for (const message of messages) {
    try {
      const content = parseSqsMessage(message)

      const processor = getCommsProcessor(content)

      await processor(content)
    } catch (error) {
      logger.error(`Error processing message: ${error.message}`)
    }

    completed.push(message)
  }

  return completed
}

export { handleCommRequestMessages }
