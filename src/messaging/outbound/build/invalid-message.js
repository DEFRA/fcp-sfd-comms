import crypto from 'crypto'

import { SOURCE } from '../../../constants/source.js'

export const buildInvalidMessage = (message, type, statusDetails) => ({
  id: crypto.randomUUID(),
  source: SOURCE,
  type,
  time: new Date(),
  data: {
    correlationId: message.data?.correlationId ?? message.id,
    statusDetails
  },
  datacontenttype: 'application/json',
  specversion: '1.0'
})
