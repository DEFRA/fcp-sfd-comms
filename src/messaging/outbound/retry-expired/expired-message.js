import crypto from 'crypto'

import { SOURCE } from '../../../constants/source.js'
import { commsEvents } from '../../../constants/comms-events.js'

export const buildExpiredMessage = (message, recipient) => ({
  id: crypto.randomUUID(),
  source: SOURCE,
  type: commsEvents.RETRY_EXPIRED,
  time: new Date(),
  data: {
    correlationId: message.data?.correlationId ?? message.id,
    commsAddresses: recipient
  },
  datacontenttype: 'application/json',
  specversion: '1.0'
})
