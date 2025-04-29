import { config } from '../../config/index.js'

import { finishedStatus, retryableStatus } from '../../constants/notify-statuses.js'

import { createLogger } from '../../logging/logger.js'

import {
  getOriginalNotificationRequest,
  getPendingNotifications,
  updateNotificationStatus
} from '../../repos/notification-log.js'

import { getNotifyStatus } from './get-notify-status.js'
import { publishStatus } from '../../messaging/outbound/notification-status/publish-status.js'
import { publishRetryExpired } from '../../messaging/outbound/retry-expired/publish-expired.js'
import { checkRetryable } from '../../utils/errors.js'
import { publishRetryRequest } from '../../messaging/outbound/notification-retry/notification-retry.js'

const logger = createLogger()

const processStatusUpdate = async (notification, status) => {
  const { message, createdAt, recipient } = notification

  await updateNotificationStatus(message, recipient, status)

  if (finishedStatus.includes(status)) {
    await publishStatus(message, recipient, status)
  }

  if (!retryableStatus.includes(status)) {
    return
  }

  const correlationId = message.data.correlationId

  let intialCreation = new Date(createdAt)

  if (correlationId) {
    const original = await getOriginalNotificationRequest(correlationId)
    intialCreation = new Date(original.createdAt)
  }

  if (checkRetryable(status, intialCreation)) {
    logger.info(`Scheduling notification retry for request: ${correlationId || message.id}`)
    await publishRetryRequest(message, recipient, config.get('notify.messageRetries.retryDelay'))
  } else {
    logger.info(`Retry window expired for request: ${correlationId || message.id}`)
    await publishRetryExpired(message, recipient)
  }
}

const checkNotifyStatusHandler = async () => {
  logger.info('Checking notify status')

  const pending = await getPendingNotifications()

  if (pending.length === 0) {
    logger.info('No pending notifications')
    return
  }

  let updates = 0

  for (const notification of pending) {
    try {
      const status = await getNotifyStatus(notification.notificationId)

      if (status === notification.status) {
        continue
      }
      await processStatusUpdate(notification, status)

      updates += 1
    } catch (error) {
      logger.error(`Error checking notification ${notification.id}: ${error.message}`)
    }
  }

  logger.info(`Updated ${updates} notifications`)
}

export { checkNotifyStatusHandler }
