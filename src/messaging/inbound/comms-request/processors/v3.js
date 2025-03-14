import { createLogger } from '../../../../logging/logger.js'
import { validate } from '../../../../schemas/validate.js'

import { v3 } from '../../../../schemas/comms-request/index.js'

import { UnprocessableMessageError } from '../../../../errors/message-errors.js'
import { checkNotificationIdempotency, addNotificationRequest } from '../../../../repos/notification-log.js'

const logger = createLogger()

const processV3CommsRequest = async (message) => {
  const [validated, err] = await validate(v3, message)

  if (err) {
    logger.error(`Invalid comms V3 payload: ${err.details.map(d => d.message)}`)

    throw new UnprocessableMessageError('Invalid message', {
      cause: err
    })
  }

  if (await checkNotificationIdempotency(validated)) {
    return logger.warn(`Comms V3 request already processed, eventId: ${validated.id}`)
  }

  await addNotificationRequest(validated)

  return logger.info(`Comms V3 request processed successfully, eventId: ${validated.id}`)
}

export { processV3CommsRequest }
