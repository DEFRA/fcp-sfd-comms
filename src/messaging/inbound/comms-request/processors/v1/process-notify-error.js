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
    const errorData = notifyError?.data
    const statusCode = notifyError?.status

    if (errorData.errors) {
      const errorMessage = errorData.errors.map((err) => err.message).join(', ')

      logger.warn(`Failed to send via GOV Notify for request ${message.source}-${message.id}. Status code: ${statusCode}, Message: ${errorMessage}`)
    }

    const technicalFailure = isServerErrorCode(statusCode)

    const status = technicalFailure
      ? notifyStatuses.TECHNICAL_FAILURE
      : notifyStatuses.INTERNAL_FAILURE

    await updateNotificationStatus(message, {
      status,
      error: errorData
    })

    await publishStatus(message, recipient, status, null, errorData) // need to add a content property here or allow it to be null in publish status

    if (technicalFailure) {
      logger.info(`Scheduling notification retry for message: ${message.id}`)
      await publishRetryRequest(message, recipient, config.get('notify.retries.retryDelay'))
    }
  } catch (error) {
    logger.error(error, `Error processing gov notify error response for message: ${message.source}-${message.id}`)
  }
}

export { processNotifyError }
