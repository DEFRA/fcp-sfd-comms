import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import { sqsClient } from '../../../../src/messaging/sqs/client.js'

const mockStartCommsListener = jest.fn()
const mockStopCommsListener = jest.fn()

jest.unstable_mockModule('../../../../src/messaging/inbound/comms-request/consumer.js', () => ({
  startCommsListener: mockStartCommsListener,
  stopCommsListener: mockStopCommsListener
}))

const { startMessaging, stopMessaging } = await import('../../../../src/messaging/inbound/inbound.js')

describe('inbound messaging setup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should start message consumers', () => {
    startMessaging()

    expect(mockStartCommsListener).toHaveBeenCalledWith(sqsClient)
  })

  test('should stop message consumers', () => {
    stopMessaging()

    expect(mockStopCommsListener).toHaveBeenCalled()
  })
})
