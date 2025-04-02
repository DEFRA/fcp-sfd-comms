import { createLogger } from '../../../../logging/logger.js'

import { config } from '../../../../config/index.js'

import { validate } from '../../../../schemas/validate.js'
import { v3 } from '../../../../schemas/comms-request/index.js'

import {
  checkNotificationIdempotency,
  addNotificationRequest,
  updateNotificationStatus,
  getOriginalNotificationRequest
} from '../../../../repos/notification-log.js'

import { trySendViaNotify } from '../notify-service/try-send-via-notify.js'
import { checkNotificationStatus } from '../notify-service/check-notification-status.js'
import { notifyStatuses, retryableStatus } from '../../../../constants/notify-statuses.js'
import { checkRetryWindow, isServerErrorCode } from '../../../../utils/errors.js'
import { publishRetryRequest } from '../../../outbound/notification-retry.js'

const logger = createLogger()

const processNotifySuccess = async (message, recipient, response) => {
  try {
    const status = await checkNotificationStatus(message, recipient, response.data.id)

    if (!retryableStatus.includes(status)) {
      return
    }

    const correlationId = message.data.correlationId

    let initialCreation = new Date()

    if (correlationId) {
      const { createdAt } = await getOriginalNotificationRequest(correlationId)

      initialCreation = createdAt
    }

    if (checkRetryWindow(status, initialCreation)) {
      logger.info(`Scheduling notification retry for message: ${message.id}`)
      await publishRetryRequest(message, recipient, config.get('notify.retries.retryDelay'))
    } else {
      logger.info(`Retry window expired for request: ${correlationId || message.id}`)
    }
  } catch (err) {
    logger.error(`Failed checking notification status: ${err.message}`)
  }
}

const processNotifyError = async (message, recipient, notifyError) => {
  try {
    const technicalFailure = isServerErrorCode(notifyError?.status)

    const status = technicalFailure
      ? notifyStatuses.TECHNICAL_FAILURE
      : notifyStatuses.INTERNAL_FAILURE

    await updateNotificationStatus(message, recipient, status, notifyError.data)

    if (technicalFailure) {
      logger.info(`Scheduling notification retry for message: ${message.id}`)
      await publishRetryRequest(message, recipient, config.get('notify.retries.retryDelay'))
    }
  } catch (err) {
    logger.error(`Failed handling failed notification: ${err.message}`)
  }
}

const processV3CommsRequest = async (message) => {
  const [validated, err] = await validate(v3, message)

  if (err) {
    return logger.error(`Invalid comms V3 payload: ${err.details.map(d => d.message)}`)
  }

  if (await checkNotificationIdempotency(validated)) {
    return logger.warn(`Comms V3 request already processed, eventId: ${validated.id}`)
  }

  await addNotificationRequest(validated)

  const data = message.data

  const params = {
    personalisation: data.personalisation,
    reference: data.correlationId ?? message.id,
    emailReplyToId: data.emailReplyToId
  }

  const recipients = Array.isArray(data.commsAddresses)
    ? data.commsAddresses
    : [data.commsAddresses]

  for (const recipient of recipients) {
    const [response, notifyError] = await trySendViaNotify(data.notifyTemplateId, recipient, params)

    if (response) {
      await processNotifySuccess(message, recipient, response)
    } else {
      await processNotifyError(message, recipient, notifyError)
    }
  }

  return logger.info(`Comms V3 request processed successfully, eventId: ${validated.id}`)
}

export { processV3CommsRequest }
