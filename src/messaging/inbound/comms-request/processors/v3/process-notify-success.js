import { config } from '../../../../../config/index.js'

import { retryableStatus } from '../../../../../constants/notify-statuses.js'

import { createLogger } from '../../../../../logging/logger.js'

import { checkNotifyStatusHandler } from '../../../../../services/notify-service/check-notification-status.js'
import { getOriginalNotificationRequest } from '../../../../../repos/notification-log.js'
import { checkRetryable } from '../../../../../utils/errors.js'
import { publishRetryRequest } from '../../../../outbound/notification-retry/notification-retry.js'
import { publishStatus } from '../../../../outbound/notification-status/publish-status.js'
import { publishRetryExpired } from '../../../../outbound/retry-expired/publish-expired.js'

const logger = createLogger()

const processNotifySuccess = async (message, recipient, response) => {
  try {
    const status = await checkNotifyStatusHandler(message, recipient, response.data.id)

    await publishStatus(message, recipient, status)

    if (!retryableStatus.includes(status)) {
      return
    }

    const correlationId = message.data.correlationId

    let initialCreation = new Date()

    if (correlationId) {
      const { createdAt } = await getOriginalNotificationRequest(correlationId)

      initialCreation = createdAt
    }

    if (checkRetryable(status, initialCreation)) {
      logger.info(`Scheduling notification retry for message: ${message.id}`)
      await publishRetryRequest(message, recipient, config.get('notify.retries.retryDelay'))
    } else {
      logger.info(`Retry window expired for request: ${correlationId}`)
      await publishRetryExpired(message, recipient)
    }
  } catch (err) {
    logger.error(`Failed checking notification status: ${err.message}`)
  }
}

export { processNotifySuccess }
