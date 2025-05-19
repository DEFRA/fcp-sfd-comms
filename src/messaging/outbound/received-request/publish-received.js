import { createLogger } from '../../../logging/logger.js'
import { config } from '../../../config/index.js'
import { snsClient } from '../../sns/client.js'
import { publish } from '../../sns/publish.js'
import { buildReceivedMessage } from './received-message.js'
import { commsEvents } from '../../../constants/comms-events.js'

const snsTopic = config.get('messaging.commEvents.topicArn')

const logger = createLogger()

const publishReceivedMessage = async (message) => {
  const type = message.type !== commsEvents.RETRY
    ? commsEvents.RECEIVED
    : commsEvents.RETRY

  const receivedMessage = buildReceivedMessage(message, type)

  try {
    await publish(snsClient, snsTopic, receivedMessage)
  } catch (error) {
    logger.error('Error publishing received message to SNS:', { cause: error })
  }
}

export { publishReceivedMessage }
