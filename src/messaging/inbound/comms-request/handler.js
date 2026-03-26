import { createLogger } from '../../../logging/logger.js'
import { runWithCorrelationId } from '../../../logging/correlation-id-store.js'

import { getCommsProcessor } from './processors/processor.js'

import { parseSqsMessage } from '../../sqs/parse-message.js'

const logger = createLogger()

const handleCommRequestMessages = async (messages) => {
  const completed = []

  for (const message of messages) {
    try {
      const content = parseSqsMessage(message)

      const correlationId = content.data?.correlationId ?? content.id

      const processor = getCommsProcessor(content)

      await runWithCorrelationId(correlationId, async () => {
        try {
          await processor(content)
        } catch (error) {
          logger.error(error, 'Error encountered while processing comms request')
        }
      })
    } catch (error) {
      logger.error(error, 'Error encountered while processing comms request')
    }

    completed.push(message)
  }

  return completed
}

export { handleCommRequestMessages }
