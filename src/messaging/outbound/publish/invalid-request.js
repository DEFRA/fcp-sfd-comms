import { config } from '../../../config/index.js'
import { snsClient } from '../sns/client.js'
import { publish } from '../sns/publish.js'
import { commsEvents } from '../../../constants/comms-events.js'
import { notifyStatuses } from '../../../constants/notify-statuses.js'
import { buildInvalidMessage } from '../build/invalid-message.js'

const snsTopic = config.get('messaging.dataAccessLayer.topicArn')

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
    await publish(snsClient, snsTopic, JSON.stringify(invalidRequest))
  } catch (error) {
    console.error('Error publishing invalid request to SNS:', { cause: error })
  }
}

export { publishInvalidRequest }
