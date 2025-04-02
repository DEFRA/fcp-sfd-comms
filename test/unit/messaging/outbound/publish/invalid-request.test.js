import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import { commsEvents } from '../../../../../src/constants/comms-events.js'
import { notifyStatuses } from '../../../../../src/constants/notify-statuses.js'

const mockConfigGet = jest.fn()
const mockSnsClient = {}
const mockPublish = jest.fn()
const mockBuildInvalidMessage = jest.fn()

jest.unstable_mockModule('../../../../../src/config/index.js', () => ({
  config: { get: mockConfigGet }
}))

jest.unstable_mockModule('../../../../../src/messaging/outbound/sns/client.js', () => ({
  snsClient: mockSnsClient
}))

jest.unstable_mockModule('../../../../../src/messaging/outbound/sns/publish.js', () => ({
  publish: mockPublish
}))

jest.unstable_mockModule('../../../../../src/messaging/outbound/build/invalid-message.js', () => ({
  buildInvalidMessage: mockBuildInvalidMessage
}))

describe('Publish Invalid Request', () => {
  beforeEach(async () => {
    jest.resetModules()
    mockConfigGet.mockReturnValue('test-invalid-topic-arn')
  })

  test('should publish an invalid request with VALIDATION_FAILURE status', async () => {
    const message = { id: '9F37DA7E-4422-40C6-983C-85F692477BE6', type: commsEvents.VALIDATION_FAILURE }
    const errors = { details: [{ message: 'Invalid field' }] }
    const statusDetails = {
      status: notifyStatuses.VALIDATION_FAILURE,
      errors: [{ error: 'ValidationError', message: 'Invalid field' }]
    }
    const invalidRequest = { transformed: 'invalid-message' }

    mockBuildInvalidMessage.mockReturnValue(invalidRequest)

    const { publishInvalidRequest } = await import('../../../../../src/messaging/outbound/publish/invalid-request.js')
    await publishInvalidRequest(message, errors)

    expect(mockBuildInvalidMessage).toHaveBeenCalledWith(message, commsEvents.VALIDATION_FAILURE, statusDetails)
    expect(mockPublish).toHaveBeenCalledWith(mockSnsClient, 'test-invalid-topic-arn', invalidRequest)
  })

  test('should log an error if publish fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const message = { id: '9F37DA7E-4422-40C6-983C-85F692477BE6', type: 'some-event' }
    const errors = { details: [{ message: 'Invalid field' }] }

    mockBuildInvalidMessage.mockReturnValue({ transformed: 'invalid-message' })
    mockPublish.mockRejectedValue(new Error('Publish error'))

    const { publishInvalidRequest } = await import('../../../../../src/messaging/outbound/publish/invalid-request.js')
    await publishInvalidRequest(message, errors)

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error publishing invalid request to SNS:', expect.objectContaining({ cause: expect.any(Error) }))

    consoleErrorSpy.mockRestore()
  })
})
