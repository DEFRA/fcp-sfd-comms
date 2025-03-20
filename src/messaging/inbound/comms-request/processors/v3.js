import { createLogger } from '../../../../logging/logger.js'
import { validate } from '../../../../schemas/validate.js'

import { v3 } from '../../../../schemas/comms-request/index.js'

import { checkNotificationIdempotency, addNotificationRequest } from '../../../../repos/notification-log.js'

import { trySendViaNotify } from '../try-send-via-notify.js'

const logger = createLogger()

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

  const emailAddresses = Array.isArray(data.commsAddresses)
    ? data.commsAddresses
    : [data.commsAddresses]

  for (const emailAddress of emailAddresses) {
    await trySendViaNotify(data.notifyTemplateId, emailAddress, params)
  }

  return logger.info(`Comms V3 request processed successfully, eventId: ${validated.id}`)
}

export { processV3CommsRequest }
