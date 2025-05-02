import { SOURCE } from '../../../constants/source.js'
import { commsEvents } from '../../../constants/comms-events.js'

export const buildRetryMessage = (message, recipient, retryId) => ({
  ...message,
  id: retryId,
  source: SOURCE,
  type: commsEvents.RETRY,
  time: new Date(),
  data: {
    ...message.data,
    correlationId: message.data.correlationId ?? message.id,
    recipient
  }
})
