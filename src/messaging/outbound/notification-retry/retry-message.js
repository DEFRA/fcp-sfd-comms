import { commsEvents } from '../../../constants/comms-events.js'

export const buildRetryMessage = (message, recipient, retryId) => ({
  ...message,
  id: retryId,
  type: commsEvents.RETRY,
  time: new Date(),
  data: {
    ...message.data,
    correlationId: message.data.correlationId ?? message.id,
    recipient
  }
})
