import { config } from '../../config/index.js'

import { createLogger } from '../../logging/logger.js'
import { runWithCorrelationId } from '../../logging/correlation-id-store.js'

import { getOriginalNotificationRequest } from '../../repos/notification-log.js'
import { publishRetryExpired } from '../../messaging/outbound/retry-expired/publish-expired.js'
import { checkRetryable } from '../../utils/errors.js'
import { publishRetryRequest } from '../../messaging/outbound/notification-retry/notification-retry.js'

const logger = createLogger()

const calculateRequestDate = async (message, createdAt) => {
  const { correlationId } = message.data

  if (!correlationId) {
    return new Date(createdAt)
  }

  const original = await getOriginalNotificationRequest(message.source, correlationId)

  if (!original) {
    throw new Error(`Cannot calculate retry window for correlation id (${correlationId}) - original request not found`)
  }

  return new Date(original.createdAt)
}

const checkRetry = async (notification, status) => {
  const { id: retryId, message, createdAt } = notification
  const { correlationId, recipient } = message.data

  await runWithCorrelationId(correlationId || message.id, async () => {
    const intialCreation = await calculateRequestDate(message, createdAt)

    if (checkRetryable(status, intialCreation)) {
      logger.info('Scheduling notification retry')
      await publishRetryRequest(message, recipient, config.get('notify.retries.retryDelay'), retryId)
    } else {
      logger.info('Retry window expired')
      await publishRetryExpired(message, recipient)
    }
  })
}

export {
  checkRetry,
  calculateRequestDate
}
