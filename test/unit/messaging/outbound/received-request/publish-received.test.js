import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import { commsEvents } from '../../../../../src/constants/comms-events.js'

const mockConfigGet = jest.fn()
const mockSnsClient = {}
const mockPublish = jest.fn()
const mockBuildReceivedMessage = jest.fn()

jest.unstable_mockModule('../../../../../src/config/index.js', () => ({
  config: { get: mockConfigGet }
}))

jest.unstable_mockModule('../../../../../src/messaging/sns/client.js', () => ({
  snsClient: mockSnsClient
}))

jest.unstable_mockModule('../../../../../src/messaging/sns/publish.js', () => ({
  publish: mockPublish
}))

jest.unstable_mockModule('../../../../../src/messaging/outbound/received-request/received-message.js', () => ({
  buildReceivedMessage: mockBuildReceivedMessage
}))

describe('Publish Received Message', () => {
  beforeEach(() => {
    jest.resetModules()
    mockConfigGet.mockReturnValue('test-topic-arn')
  })

  test('should publish a received message with RECEIVED if message type is RECEIVED', async () => {
    const message = { id: '2DA6D8DB-81DD-48DF-88CE-938F4D3AA8F6', type: commsEvents.RECEIVED }
    const receivedMessage = { transformed: 'message' }

    mockBuildReceivedMessage.mockReturnValue(receivedMessage)

    const { publishReceivedMessage } = await import('../../../../../src/messaging/outbound/received-request/publish-received.js')
    await publishReceivedMessage(message)

    expect(mockBuildReceivedMessage).toHaveBeenCalledWith(message, 'uk.gov.fcp.sfd.notification.received')
    expect(mockPublish).toHaveBeenCalledWith(mockSnsClient, 'test-topic-arn', receivedMessage)
  })

  test('should publish a received message with RETRY type if message type is RETRY', async () => {
    const message = { id: '2DA6D8DB-81DD-48DF-88CE-938F4D3AA8F6', type: commsEvents.RETRY }
    const receivedMessage = { transformed: 'retry-message' }

    mockBuildReceivedMessage.mockReturnValue(receivedMessage)

    const { publishReceivedMessage } = await import('../../../../../src/messaging/outbound/received-request/publish-received.js')
    await publishReceivedMessage(message)

    expect(mockBuildReceivedMessage).toHaveBeenCalledWith(message, 'uk.gov.fcp.sfd.notification.retry')
    expect(mockPublish).toHaveBeenCalledWith(mockSnsClient, 'test-topic-arn', receivedMessage)
  })

  test('should log an error if publish fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const message = { id: '12342DA6D8DB-81DD-48DF-88CE-938F4D3AA8F6', type: commsEvents.VALIDATION_FAILURE }

    mockBuildReceivedMessage.mockReturnValue({ transformed: 'message' })
    mockPublish.mockRejectedValue(new Error('Publish error'))

    const { publishReceivedMessage } = await import('../../../../../src/messaging/outbound/received-request/publish-received.js')
    await publishReceivedMessage(message)

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error publishing received message to SNS:', expect.objectContaining({ cause: expect.any(Error) }))

    consoleErrorSpy.mockRestore()
  })
})
