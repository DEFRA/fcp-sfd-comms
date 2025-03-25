import { createLogger } from '../../../../logging/logger.js'
import { validate } from '../../../../schemas/validate.js'

import { v3 } from '../../../../schemas/comms-request/index.js'

import {
  checkNotificationIdempotency,
  addNotificationRequest,
  updateNotificationStatus
} from '../../../../repos/notification-log.js'

import { checkNotificationStatus, trySendViaNotify } from '../notify-service.js'
import { notifyStatuses } from '../../../../constants/notify-statuses.js'

const logger = createLogger()

const handleRecipient = async (message, recipient) => {
  const data = message.data

  const params = {
    personalisation: data.personalisation,
    reference: data.correlationId ?? message.id,
    emailReplyToId: data.emailReplyToId
  }

  const [response] = await trySendViaNotify(data.notifyTemplateId, recipient, params)

  if (response) {
    try {
      await updateNotificationStatus(message, recipient, notifyStatuses.SENDING)
    } catch (err) {
      logger.error(`Failed updating notification status: ${err.message}`)
    }

    try {
      await checkNotificationStatus(message, recipient, response.data.id)
    } catch (err) {
      logger.error(`Failed checking notification status: ${err.message}`)
    }
  } else {
    try {
      await updateNotificationStatus(message, recipient, notifyStatuses.INTERNAL_FAILURE)
    } catch (err) {
      logger.error(`Failed updating notification status: ${err.message}`)
    }
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

  const recipients = Array.isArray(data.commsAddresses)
    ? data.commsAddresses
    : [data.commsAddresses]

  const handlers = recipients.map((recipient) => handleRecipient(validated, recipient))

  await Promise.all(handlers)

  return logger.info(`Comms V3 request processed successfully, eventId: ${validated.id}`)
}

export { processV3CommsRequest }
