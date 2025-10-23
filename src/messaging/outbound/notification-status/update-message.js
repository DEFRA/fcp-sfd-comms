import crypto from 'crypto'

import { SOURCE } from '../../../constants/source.js'

export const buildUpdateMessage = (message, recipient, type, statusDetails, content) => ({
  id: crypto.randomUUID(),
  source: SOURCE,
  type,
  time: new Date(),
  data: {
    correlationId: message.data?.correlationId ?? message.id,
    recipient,
    statusDetails,
    content
    // ...(content && { content }) only include content property if its truthy, supports only sending content on a certain event type.
  },
  datacontenttype: 'application/json',
  specversion: '1.0'
})
