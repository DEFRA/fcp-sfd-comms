import { vi, describe, test, expect, beforeEach } from 'vitest'

import { sqsClient } from '../../../../src/messaging/sqs/client.js'
import { startCommsListener, stopCommsListener } from '../../../../src/messaging/inbound/comms-request/consumer.js'

vi.mock('../../../../src/messaging/inbound/comms-request/consumer.js', () => ({
  startCommsListener: vi.fn(),
  stopCommsListener: vi.fn()
}))

const { startMessaging, stopMessaging } = await import('../../../../src/messaging/inbound/inbound.js')

describe('inbound messaging setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should start message consumers', () => {
    startMessaging()

    expect(startCommsListener).toHaveBeenCalledWith(sqsClient)
  })

  test('should stop message consumers', () => {
    stopMessaging()

    expect(stopCommsListener).toHaveBeenCalled()
  })
})
