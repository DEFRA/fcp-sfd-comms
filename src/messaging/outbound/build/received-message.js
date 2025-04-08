import crypto from 'crypto'

import { SOURCE } from '../../../constants/source.js'

export const buildReceivedMessage = (message, type) => ({
  id: crypto.randomUUID(),
  source: SOURCE,
  type,
  time: new Date(),
  data: {
    correlationId: message.data?.correlationId ?? message.id
  },
  datacontenttype: 'application/json',
  specversion: '1.0'
})
