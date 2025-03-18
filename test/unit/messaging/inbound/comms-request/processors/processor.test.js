import { describe, test, expect } from '@jest/globals'

import v3CommsRequest from '../../../../../../src/schemas/comms-request/v3.js'

import { UnprocessableMessageError } from '../../../../../../src/errors/message-errors.js'
import { getCommsProcessor } from '../../../../../../src/messaging/inbound/comms-request/processors/processor.js'
import { processV3CommsRequest } from '../../../../../../src/messaging/inbound/comms-request/processors/v3.js'

describe('comms request processor selection', () => {
  test('unknown message type should throw unprocessable message', () => {
    const message = {}

    expect(() => getCommsProcessor(message)).toThrow(UnprocessableMessageError)
  })

  test.each([
    'uk.gov.fcp.sfd.notification.request',
    'uk.gov.fcp.sfd.notification.retry'
  ])('Supported %s type with no version should return v3 processor', (eventType) => {
    const message = {
      ...v3CommsRequest,
      type: eventType
    }

    const processor = getCommsProcessor(message)

    expect(processor).toBe(processV3CommsRequest)
  })
})
