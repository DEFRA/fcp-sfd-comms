import { createLogger } from '../../../logging/logger.js'

import notifyClient from '../../../notify/notify-client.js'

const logger = createLogger()

const trySendViaNotify = async (templateId, emailAddress, params = {}) => {
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

const getNotifyStatus = async (id) => {
  const { data } = await notifyClient.getNotificationById(id)

  return {
    id: data.id,
    status: data.status
  }
}

const checkNotificationStatus = async (messageId, notifyId) => {
  try {
    const { status } = await getNotifyStatus(notifyId)
  } catch (error) {
    throw new Error(`Failed to check notification status for ${messageId}`, { cause: error })
  }
}

export { trySendViaNotify }
