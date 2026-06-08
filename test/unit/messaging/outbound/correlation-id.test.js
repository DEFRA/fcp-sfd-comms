import { describe, test, expect } from 'vitest'

import { buildInvalidMessage } from '../../../../src/messaging/outbound/invalid-request/invalid-message.js'
import { buildReceivedMessage } from '../../../../src/messaging/outbound/received-request/received-message.js'
import { buildRetryMessage } from '../../../../src/messaging/outbound/notification-retry/retry-message.js'
import { buildExpiredMessage } from '../../../../src/messaging/outbound/retry-expired/expired-message.js'
import { buildUpdateMessage } from '../../../../src/messaging/outbound/notification-status/update-message.js'

const baseMessage = (overrides = {}) => ({
  id: 'message-id-123',
  data: {
    crn: 1,
    sbi: 2,
    ...overrides
  }
})

describe('outbound builders - correlationId fallback', () => {
  const builders = [
    { name: 'invalid', fn: (msg) => buildInvalidMessage(msg, 'type', { reason: 'x' }) },
    { name: 'received', fn: (msg) => buildReceivedMessage(msg, 'type') },
    { name: 'retry', fn: (msg) => buildRetryMessage(msg, 'recipient', 'retry-id') },
    { name: 'expired', fn: (msg) => buildExpiredMessage(msg, 'recipient') },
    { name: 'update', fn: (msg) => buildUpdateMessage(msg, 'recipient', 'type', { reason: 'x' }, { body: 'ok' }) }
  ]

  test('uses provided correlationId when present', () => {
    const msg = baseMessage({ correlationId: 'corr-uuid-1' })
    for (const b of builders) {
      const out = b.fn(msg)
      expect(out.data.correlationId).toBe('corr-uuid-1')
    }
  })

  test('falls back to message.id when correlationId is empty string', () => {
    const msg = baseMessage({ correlationId: '' })
    for (const b of builders) {
      const out = b.fn(msg)
      expect(out.data.correlationId).toBe(msg.id)
    }
  })

  test('falls back to message.id when correlationId is null', () => {
    const msg = baseMessage({ correlationId: null })
    for (const b of builders) {
      const out = b.fn(msg)
      expect(out.data.correlationId).toBe(msg.id)
    }
  })
})
