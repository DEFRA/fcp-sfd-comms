import { finishedStatus, retryableStatus } from '../../constants/notify-statuses.js'

import { createLogger } from '../../logging/logger.js'

import {
  getPendingNotifications,
  updateNotificationStatus
} from '../../repos/notification-log.js'

import { getNotifyResult } from './get-notify-result.js'
import { publishStatus } from '../../messaging/outbound/notification-status/publish-status.js'
import { checkRetry } from './check-retry.js'

const logger = createLogger()

const processStatusUpdate = async (notification, status, content) => {
  const { message } = notification

  const recipient = message.data.recipient

  await updateNotificationStatus(message, {
    status
  })

  if (finishedStatus.includes(status)) {
    await publishStatus(message, recipient, status, content)
  }

  if (!retryableStatus.includes(status)) {
    return
  }

  await checkRetry(notification, status)
}

const checkNotifyStatusHandler = async () => {
  let pending = []

  try {
    pending = await getPendingNotifications()
  } catch (error) {
    logger.error(error, 'Error checking pending notifications')
  }

  if (pending.length === 0) {
    return
  }

  let updates = 0

  for (const notification of pending) {
    const {
      notificationId,
      status
    } = notification.statusDetails

    try {
      const notifyResult = await getNotifyResult(notificationId)
      
      if (notifyResult.status === status) {
        continue
      }

      await processStatusUpdate(notification, notifyResult.status, notifyResult.content)

      updates += 1
    } catch (error) {
      logger.error(error, `Error checking notification ${notificationId}`)
    }
  }

  logger.info(`Updated ${updates} notifications`)
}

export { checkNotifyStatusHandler }
