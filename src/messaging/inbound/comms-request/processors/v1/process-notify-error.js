import { config } from '../../../../../config/index.js'

import { notifyStatuses } from '../../../../../constants/notify-statuses.js'

import { createLogger } from '../../../../../logging/logger.js'

import { isServerErrorCode } from '../../../../../utils/errors.js'
import { updateNotificationStatus } from '../../../../../repos/notification-log.js'
import { publishRetryRequest } from '../../../../outbound/notification-retry/notification-retry.js'
import { publishStatus } from '../../../../outbound/notification-status/publish-status.js'

const logger = createLogger()

const processNotifyError = async (message, recipient, notifyError) => {
  try {
    const technicalFailure = isServerErrorCode(notifyError?.status)

    const status = technicalFailure
      ? notifyStatuses.TECHNICAL_FAILURE
      : notifyStatuses.INTERNAL_FAILURE

    await updateNotificationStatus(message, { status, error: notifyError.data })
    await publishStatus(message, recipient, status, notifyError.data)

    if (technicalFailure) {
      logger.info(`Scheduling notification retry for message: ${message.id}`)
      await publishRetryRequest(message, recipient, config.get('notify.retries.retryDelay'))
    }
  } catch (err) {
    logger.error(`Error handling failed notification: ${err.message}`)
  }
}

export { processNotifyError }
