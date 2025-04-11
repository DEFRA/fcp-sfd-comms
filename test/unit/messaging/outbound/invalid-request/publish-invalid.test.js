import { beforeEach, describe, expect, vi, test } from 'vitest'

import { commsEvents } from '../../../../../src/constants/comms-events.js'
import { notifyStatuses } from '../../../../../src/constants/notify-statuses.js'

import { publish } from '../../../../../src/messaging/sns/publish.js'
import { buildInvalidMessage } from '../../../../../src/messaging/outbound/invalid-request/invalid-message.js'

const mockSnsClient = {}
const mockConfigGet = vi.fn()

vi.mock('../../../../../src/config/index.js', () => ({
  config: { get: mockConfigGet }
}))

vi.mock('../../../../../src/messaging/sns/client.js', () => ({
  snsClient: mockSnsClient
}))

vi.mock('../../../../../src/messaging/sns/publish.js', () => ({
  publish: vi.fn()
}))

vi.mock('../../../../../src/messaging/outbound/invalid-request/invalid-message.js', () => ({
  buildInvalidMessage: vi.fn()
}))

describe('Publish Invalid Request', () => {
  beforeEach(() => {
    vi.resetModules()
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

    buildInvalidMessage.mockReturnValue(invalidRequest)

    const { publishInvalidRequest } = await import('../../../../../src/messaging/outbound/invalid-request/publish-invalid.js')
    await publishInvalidRequest(message, errors)

    expect(buildInvalidMessage).toHaveBeenCalledWith(message, commsEvents.VALIDATION_FAILURE, statusDetails)
    expect(publish).toHaveBeenCalledWith(mockSnsClient, 'test-invalid-topic-arn', invalidRequest)
  })

  test('should log an error if publish fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const message = { id: '9F37DA7E-4422-40C6-983C-85F692477BE6', type: 'some-event' }
    const errors = { details: [{ message: 'Invalid field' }] }

    buildInvalidMessage.mockReturnValue({ transformed: 'invalid-message' })
    publish.mockRejectedValue(new Error('Publish error'))

    const { publishInvalidRequest } = await import('../../../../../src/messaging/outbound/invalid-request/publish-invalid.js')
    await publishInvalidRequest(message, errors)

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error publishing invalid request to SNS:', expect.objectContaining({ cause: expect.any(Error) }))

    consoleErrorSpy.mockRestore()
  })
})
