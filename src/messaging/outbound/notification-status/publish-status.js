import { createLogger } from '../../../logging/logger.js'
import { snsClient } from '../../sns/client.js'
import { publish } from '../../sns/publish.js'
import { config } from '../../../config/index.js'
import { statusToEventMap } from '../../../constants/comms-events.js'
import { buildUpdateMessage } from './update-message.js'

const snsTopic = config.get('messaging.commEvents.topicArn')

const logger = createLogger()

const publishStatus = async (message, recipient, status, notifyError) => {
  const type = statusToEventMap[status]

  const statusDetails = {
    status,
    errorCode: notifyError?.status_code,
    errors: notifyError?.errors
  }

  const statusMessage = buildUpdateMessage(message, recipient, type, statusDetails)

  try {
    await publish(snsClient, snsTopic, statusMessage)
  } catch (error) {
    logger.error(error, 'Error publishing comms request status update event')
  }
}

export { publishStatus }
