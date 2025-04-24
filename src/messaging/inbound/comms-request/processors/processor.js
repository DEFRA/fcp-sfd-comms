import { commsEvents } from '../../../../constants/comms-events.js'
import { UnprocessableMessageError } from '../../../../errors/message-errors.js'

import { processV1CommsRequest } from './v1/v1.js'

const processorMap = {
  [commsEvents.REQUEST]: processV1CommsRequest,
  [commsEvents.RETRY]: processV1CommsRequest
}

const getCommsProcessor = (message) => {
  const processor = processorMap[message?.type]

  if (!processor) {
    throw new UnprocessableMessageError('Unsupported message type')
  }

  return processor
}

export { getCommsProcessor }
