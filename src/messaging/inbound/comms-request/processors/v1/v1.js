import { createLogger } from '../../../../../logging/logger.js'

import { validate } from '../../../../../schemas/validate.js'
import { v1 } from '../../../../../schemas/comms-request/index.js'

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

const processV1CommsRequest = async (message) => {
  const [validated, err] = await validate(v1, message)

  if (err) {
    await publishInvalidRequest(message, err)
    return logger.error(`Invalid comms V1 payload: ${err.details.map(d => d.message)}`)
  }

  if (await checkNotificationIdempotency(validated)) {
    return logger.warn(`Comms V1 request already processed, eventId: ${validated.id}`)
  }

  await addNotificationRequest(validated)
  await publishReceivedMessage(validated)

  const data = message.data

  const params = {
    personalisation: data.personalisation,
    reference: data.correlationId ?? message.id,
    emailReplyToId: data.emailReplyToId
  }

  const recipient = data.commsAddresses

  const [response, notifyError] = await trySendViaNotify(data.notifyTemplateId, recipient, params)

  if (response) {
    await processNotifySuccess(message, recipient, response)
  } else {
    await processNotifyError(message, recipient, notifyError)
  }

  return logger.info(`Comms V1 request processed successfully, eventId: ${validated.id}`)
}

export { processV1CommsRequest }
