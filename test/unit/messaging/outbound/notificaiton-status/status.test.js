import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { statusToEventMap } from '../../../../../src/constants/comms-events.js'

const mockConfigGet = jest.fn()
const mockSnsClient = {}
const mockPublish = jest.fn()
const mockBuildUpdateMessage = jest.fn()

jest.unstable_mockModule('../../../../../src/config/index.js', () => ({
  config: { get: mockConfigGet }
}))

jest.unstable_mockModule('../../../../../src/messaging/sns/client.js', () => ({
  snsClient: mockSnsClient
}))

jest.unstable_mockModule('../../../../../src/messaging/sns/publish.js', () => ({
  publish: mockPublish
}))

jest.unstable_mockModule('../../../../../src/messaging/outbound/notification-status/update-message.js', () => ({
  buildUpdateMessage: mockBuildUpdateMessage
}))

describe('Publish Status', () => {
  beforeEach(async () => {
    jest.resetModules()
    mockConfigGet.mockReturnValue('test-topic-arn')
  })

  test('should publish a status message with correct type and details', async () => {
    const message = { id: 'BB3F13B8-A48B-43C3-85B7-6E53DE9EF227' }
    const recipient = 'test@example.com'
    const status = 'DELIVERED'
    const error = null
    const type = statusToEventMap[status]
    const statusDetails = { status, errorCode: undefined, errors: undefined }
    const statusMessage = { transformed: 'message' }

    mockBuildUpdateMessage.mockReturnValue(statusMessage)

    const { publishStatus } = await import('../../../../../src/messaging/outbound/notification-status/publish-status.js')
    await publishStatus(message, recipient, status, error)

    expect(mockBuildUpdateMessage).toHaveBeenCalledWith(message, recipient, type, statusDetails)
    expect(mockPublish).toHaveBeenCalledWith(mockSnsClient, 'test-topic-arn', statusMessage)
  })

  test('should publish a status message with error details if error is provided', async () => {
    const message = { id: 'BB3F13B8-A48B-43C3-85B7-6E53DE9EF227' }
    const recipient = 'test@example.com'
    const status = 'FAILED'
    const error = { status_code: 500, errors: ['Internal Server Error'] }
    const type = statusToEventMap[status]
    const statusDetails = { status, errorCode: 500, errors: ['Internal Server Error'] }
    const statusMessage = { transformed: 'message' }

    mockBuildUpdateMessage.mockReturnValue(statusMessage)

    const { publishStatus } = await import('../../../../../src/messaging/outbound/notification-status/publish-status.js')
    await publishStatus(message, recipient, status, error)

    expect(mockBuildUpdateMessage).toHaveBeenCalledWith(message, recipient, type, statusDetails)
    expect(mockPublish).toHaveBeenCalledWith(mockSnsClient, 'test-topic-arn', statusMessage)
  })

  test('should log an error if publish fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const message = { id: 'BB3F13B8-A48B-43C3-85B7-6E53DE9EF227' }
    const recipient = 'test@example.com'
    const status = 'DELIVERED'
    const error = null

    mockBuildUpdateMessage.mockReturnValue({ transformed: 'message' })
    mockPublish.mockRejectedValue(new Error('Publish error'))

    const { publishStatus } = await import('../../../../../src/messaging/outbound/notification-status/publish-status.js')
    await publishStatus(message, recipient, status, error)

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error publishing comms event status details to SNS:', expect.objectContaining({ cause: expect.any(Error) }))

    consoleErrorSpy.mockRestore()
  })
})
