import notifyClient from '../../../../notify/notify-client.js'
import { createLogger } from '../../../../logging/logger.js'

const logger = createLogger()

const trySendViaNotify = async (templateId, recipient, params = {}) => {
  try {
    const response = await notifyClient.sendEmail(
      templateId,
      recipient,
      params
    )

    return [response, null]
  } catch (err) {
    logger.error(`Failed to send email via GOV Notify. Error code: ${err.response?.status}`)

    return [null, err.response]
  }
}

export { trySendViaNotify }
