import { createLogger } from '../../../logging/logger.js'
import { snsClient } from '../../sns/client.js'
import { publish } from '../../sns/publish.js'
import { config } from '../../../config/index.js'
import { statusToEventMap } from '../../../constants/comms-events.js'
import { buildUpdateMessage } from './update-message.js'

const snsTopic = config.get('messaging.commEvents.topicArn')

const logger = createLogger()

const publishStatus = async (message, recipient, status, error) => {
  const type = statusToEventMap[status]

  const statusDetails = {
    status,
    errorCode: error?.status_code,
    errors: error?.errors
  }

  const statusMessage = buildUpdateMessage(message, recipient, type, statusDetails)

  try {
    await publish(snsClient, snsTopic, statusMessage)
  } catch (err) {
    logger.error('Error publishing comms event status details to SNS:', { cause: err })
  }
}

export { publishStatus }
