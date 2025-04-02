import { commsEvents } from '../../../../constants/comms-events.js'
import { UnprocessableMessageError } from '../../../../errors/message-errors.js'

import { processV3CommsRequest } from './v3.js'

const processorMap = {
  [commsEvents.REQUEST]: processV3CommsRequest,
  [commsEvents.RETRY]: processV3CommsRequest
}

const getCommsProcessor = (message) => {
  const processor = processorMap[message?.type]

  if (!processor) {
    throw new UnprocessableMessageError('Unsupported message type')
  }

  return processor
}

export { getCommsProcessor }
