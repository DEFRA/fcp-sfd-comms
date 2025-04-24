import { describe, test, expect } from 'vitest'

import v1CommsRequest from '../../../../../../src/schemas/comms-request/v1.js'

import { UnprocessableMessageError } from '../../../../../../src/errors/message-errors.js'
import { getCommsProcessor } from '../../../../../../src/messaging/inbound/comms-request/processors/processor.js'
import { processV1CommsRequest } from '../../../../../../src/messaging/inbound/comms-request/processors/v1/v1.js'

describe('comms request processor selection', () => {
  test('unknown message type should throw unprocessable message', () => {
    const message = {}

    expect(() => getCommsProcessor(message)).toThrow(UnprocessableMessageError)
  })

  test.each([
    'uk.gov.fcp.sfd.notification.request',
    'uk.gov.fcp.sfd.notification.retry'
  ])('Supported %s type with no version should return v1 processor', (eventType) => {
    const message = {
      ...v1CommsRequest,
      type: eventType
    }

    const processor = getCommsProcessor(message)

    expect(processor).toBe(processV1CommsRequest)
  })
})
