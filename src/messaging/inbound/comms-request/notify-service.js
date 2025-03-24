import { createLogger } from '../../../logging/logger.js'

import notifyClient from '../../../notify/notify-client.js'

const logger = createLogger()

const notifyService = async (templateId, emailAddress, params = {}) => {
  try {
    const response = await notifyClient.sendEmail(
      templateId,
      emailAddress,
      params
    )

    return [response, null]
  } catch (error) {
    logger.error(`Failed to send email via GOV Notify: ${error.message}`)

    return [null, error]
  }
}

export { notifyService }
