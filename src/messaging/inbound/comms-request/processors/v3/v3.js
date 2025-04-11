import { createLogger } from '../../../../../logging/logger.js'

import { validate } from '../../../../../schemas/validate.js'
import { v3 } from '../../../../../schemas/comms-request/index.js'

import {
  checkNotificationIdempotency,
  addNotificationRequest
} from '../../../../../repos/notification-log.js'

import { trySendViaNotify } from '../../notify-service/try-send-via-notify.js'

import { publishReceivedMessage } from '../../../../outbound/received-request/publish-received.js'
import { publishInvalidRequest } from '../../../../outbound/invalid-request/publish-invalid.js'

import { processNotifySuccess } from './process-notify-success.js'
import { processNotifyError } from './process-notify-error.js'

const logger = createLogger()

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
