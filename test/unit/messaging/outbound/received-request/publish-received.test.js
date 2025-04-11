import { beforeEach, describe, expect, vi, test } from 'vitest'

import { commsEvents } from '../../../../../src/constants/comms-events.js'

import { snsClient } from '../../../../../src/messaging/sns/client.js'
import { publish } from '../../../../../src/messaging/sns/publish.js'
import { buildReceivedMessage } from '../../../../../src/messaging/outbound/received-request/received-message.js'
import { publishReceivedMessage } from '../../../../../src/messaging/outbound/received-request/publish-received.js'

vi.mock('../../../../../src/messaging/sns/publish.js', () => ({
  publish: vi.fn()
}))

vi.mock('../../../../../src/messaging/outbound/received-request/received-message.js', () => ({
  buildReceivedMessage: vi.fn()
}))

describe('Publish Received Message', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  test('should publish a received message with RECEIVED if message type is RECEIVED', async () => {
    const message = { id: '2DA6D8DB-81DD-48DF-88CE-938F4D3AA8F6', type: commsEvents.RECEIVED }
    const receivedMessage = { transformed: 'message' }

    buildReceivedMessage.mockReturnValue(receivedMessage)

    await publishReceivedMessage(message)

    expect(buildReceivedMessage).toHaveBeenCalledWith(message, 'uk.gov.fcp.sfd.notification.received')
    expect(publish).toHaveBeenCalledWith(snsClient, 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo', receivedMessage)
  })

  test('should publish a received message with RETRY type if message type is RETRY', async () => {
    const message = { id: '2DA6D8DB-81DD-48DF-88CE-938F4D3AA8F6', type: commsEvents.RETRY }
    const receivedMessage = { transformed: 'retry-message' }

    buildReceivedMessage.mockReturnValue(receivedMessage)

    await publishReceivedMessage(message)

    expect(buildReceivedMessage).toHaveBeenCalledWith(message, 'uk.gov.fcp.sfd.notification.retry')
    expect(publish).toHaveBeenCalledWith(snsClient, 'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo', receivedMessage)
  })

  test('should log an error if publish fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const message = { id: '12342DA6D8DB-81DD-48DF-88CE-938F4D3AA8F6', type: commsEvents.VALIDATION_FAILURE }

    buildReceivedMessage.mockReturnValue({ transformed: 'message' })
    publish.mockRejectedValue(new Error('Publish error'))

    await publishReceivedMessage(message)

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error publishing received message to SNS:', expect.objectContaining({ cause: expect.any(Error) }))

    consoleErrorSpy.mockRestore()
  })
})
