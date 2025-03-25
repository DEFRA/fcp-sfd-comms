import notifyClient from '../../../notify/notify-client.js'

import { createLogger } from '../../../logging/logger.js'
import { finishedStatus } from '../../../constants/notify-statuses.js'

import { updateNotificationStatus } from '../../../repos/notification-log.js'
import { config } from '../../../config/index.js'

const logger = createLogger()

const maxStatusPollingAttempts = config.get('notify.statusCheckMaxAttempts')
const statusPollingInterval = config.get('notify.statusCheckInterval')

const getNotifyStatus = async (id) => {
  const { data } = await notifyClient.getNotificationById(id)

  return data.status
}

const trySendViaNotify = async (templateId, emailAddress, params = {}) => {
  try {
    const response = await notifyClient.sendEmail(
      templateId,
      emailAddress,
      params
    )

    return [response, null]
  } catch (err) {
    logger.error(`Failed to send email via GOV Notify: ${err.message}`)

    return [null, err]
  }
}

const checkNotificationStatus = async (message, recipient, notifyId) => {
  let status = null
  let attempts = 0

  while (!finishedStatus.includes(status) && attempts < maxStatusPollingAttempts) {
    try {
      status = await getNotifyStatus(notifyId)

      await updateNotificationStatus(message, recipient, status)
    } catch (err) {
      logger.error(`Failed checking notification ${notifyId}: ${err.message}`)
    }

    if (!finishedStatus.includes(status)) {
      await new Promise(resolve => setTimeout(resolve, statusPollingInterval))
    }

    attempts += 1
  }

  if (!finishedStatus.includes(status)) {
    throw new Error(`Status check for notification ${notifyId} timed out after ${attempts} attempts`)
  }

  return status
}

export { trySendViaNotify, checkNotificationStatus }
