import { createLogger } from '../../../../logging/logger.js'
import { validate } from '../../../../schemas/validate.js'

import { v3 } from '../../../../schemas/comms-request/index.js'

import {
  checkNotificationIdempotency,
  addNotificationRequest,
  updateNotificationStatus
} from '../../../../repos/notification-log.js'

import {
  publishReceivedMessage,
  publishInvalidRequest,
  publishStatus
} from '../../../outbound/publish/index.js'

import { trySendViaNotify } from '../notify-service/try-send-via-notify.js'
import { checkNotificationStatus } from '../notify-service/check-notification-status.js'
import { notifyStatuses } from '../../../../constants/notify-statuses.js'
import { isServerErrorCode } from '../../../../utils/errors.js'

const logger = createLogger()

const handleRecipient = async (message, recipient) => {
  const data = message.data

  const params = {
    personalisation: data.personalisation,
    reference: data.correlationId ?? message.id,
    emailReplyToId: data.emailReplyToId
  }

  const [response, notifyError] = await trySendViaNotify(data.notifyTemplateId, recipient, params)

  if (response) {
    try {
      const status = await checkNotificationStatus(message, recipient, response.data.id)
      await publishStatus(message, recipient, status)
    } catch (err) {
      logger.error(`Failed checking notification status: ${err.message}`)
    }
  } else {
    try {
      const technicalFailure = isServerErrorCode(notifyError?.status)

      const status = technicalFailure
        ? notifyStatuses.TECHNICAL_FAILURE
        : notifyStatuses.INTERNAL_FAILURE

      await updateNotificationStatus(message, recipient, status, notifyError.data)
      await publishStatus(message, recipient, status, notifyError.data)
    } catch (err) {
      logger.error(`Failed updating failed notification status: ${err.message}`)
    }
  }
}

const processV3CommsRequest = async (message) => {
  const [validated, err] = await validate(v3, message)

  if (err) {
    await publishInvalidRequest(message, err)
    return logger.error(`Invalid comms V3 payload: ${err.details.map(d => d.message)}`)
  }

  if (await checkNotificationIdempotency(validated)) {
    return logger.warn(`Comms V3 request already processed, eventId: ${validated.id}`)
  }

  await addNotificationRequest(validated)
  await publishReceivedMessage(validated)

  const data = message.data

  const recipients = Array.isArray(data.commsAddresses)
    ? data.commsAddresses
    : [data.commsAddresses]

  for (const recipient of recipients) {
    await handleRecipient(validated, recipient)
  }

  return logger.info(`Comms V3 request processed successfully, eventId: ${validated.id}`)
}

export { processV3CommsRequest }
