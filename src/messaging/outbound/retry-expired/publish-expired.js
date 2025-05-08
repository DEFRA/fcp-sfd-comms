import { config } from '../../../config/index.js'

import { createLogger } from '../../../logging/logger.js'

import { snsClient } from '../../sns/client.js'
import { publish } from '../../sns/publish.js'
import { buildExpiredMessage } from './expired-message.js'

const snsTopic = config.get('messaging.commEvents.topicArn')

const logger = createLogger()

const publishRetryExpired = async (message, recipient) => {
  const expiryMessage = buildExpiredMessage(message, recipient)

  try {
    await publish(snsClient, snsTopic, expiryMessage)
  } catch (err) {
    logger.error(`Error publishing retry expiry to SNS: ${err.message}`)
  }
}

export { publishRetryExpired }
