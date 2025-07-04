import { createLogger } from '../../../logging/logger.js'
import { config } from '../../../config/index.js'
import { snsClient } from '../../sns/client.js'
import { publish } from '../../sns/publish.js'
import { commsEvents } from '../../../constants/comms-events.js'
import { notifyStatuses } from '../../../constants/notify-statuses.js'
import { buildInvalidMessage } from './invalid-message.js'

const snsTopic = config.get('messaging.commEvents.topicArn')

const logger = createLogger()

const publishInvalidRequest = async (message, errors) => {
  const statusDetails = {
    status: notifyStatuses.VALIDATION_FAILURE,
    errors: errors.details.map((d) => ({
      error: 'ValidationError',
      message: d.message
    }))
  }

  const invalidRequest = buildInvalidMessage(message, commsEvents.VALIDATION_FAILURE, statusDetails)

  try {
    await publish(snsClient, snsTopic, invalidRequest)
  } catch (error) {
    logger.error(error, 'Error publishing invalid comms request event')
  }
}

export { publishInvalidRequest }
