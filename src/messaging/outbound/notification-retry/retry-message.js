import { commsEvents } from '../../../constants/comms-events.js'

export const buildRetryMessage = (message, recipient) => ({
  ...message,
  id: crypto.randomUUID(),
  type: commsEvents.RETRY,
  time: new Date(),
  data: {
    ...message.data,
    correlationId: message.data.correlationId ?? message.id,
    commsAddresses: recipient
  }
})
