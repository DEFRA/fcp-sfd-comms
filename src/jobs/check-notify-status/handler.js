import { finishedStatus, retryableStatus } from '../../constants/notify-statuses.js'

import { createLogger } from '../../logging/logger.js'

import {
  getPendingNotifications,
  updateNotificationStatus
} from '../../repos/notification-log.js'

import { getNotifyStatus } from './get-notify-status.js'
import { publishStatus } from '../../messaging/outbound/notification-status/publish-status.js'
import { checkRetry } from './check-retry.js'

const logger = createLogger()

const processStatusUpdate = async (notification, status) => {
  const { message } = notification

  const recipient = message.data.recipient

  await updateNotificationStatus(message, {
    status
  })

  if (finishedStatus.includes(status)) {
    await publishStatus(message, recipient, status)
  }

  if (!retryableStatus.includes(status)) {
    return
  }

  await checkRetry(notification, status)
}

const checkNotifyStatusHandler = async () => {
  const pending = await getPendingNotifications()

  if (pending.length === 0) {
    return
  }

  let updates = 0

  for (const notification of pending) {
    try {
      const {
        notificationId,
        status
      } = notification.statusDetails

      const notifyStatus = await getNotifyStatus(notificationId)

      if (notifyStatus === status) {
        continue
      }

      await processStatusUpdate(notification, notifyStatus)

      updates += 1
    } catch (error) {
      logger.error(`Error checking notification: ${error.message}`)
    }
  }

  logger.info(`Updated ${updates} notifications`)
}

export { checkNotifyStatusHandler }
