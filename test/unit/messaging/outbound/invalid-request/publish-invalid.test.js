import { beforeEach, describe, expect, vi, test, afterAll } from 'vitest'
import { createLogger } from '../../../../../src/logging/logger.js'
import mockCommsRequest from '../../../../mocks/comms-request/v3.js'
import { snsClient } from '../../../../../src/messaging/sns/client.js'
import { publish } from '../../../../../src/messaging/sns/publish.js'
import { publishInvalidRequest } from '../../../../../src/messaging/outbound/invalid-request/publish-invalid.js'

vi.mock('../../../../../src/messaging/sns/publish.js', () => ({
  publish: vi.fn()
}))

vi.mock('../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()

describe('Publish Invalid Request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))
  })

  test('should publish an invalid request with VALIDATION_FAILURE status', async () => {
    const errors = {
      details: [
        {
          message: 'Invalid field'
        }
      ]
    }

    await publishInvalidRequest(mockCommsRequest, errors)

    expect(publish).toHaveBeenCalledWith(
      snsClient,
      'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      expect.objectContaining({
        id: expect.any(String),
        source: 'fcp-sfd-comms',
        type: 'uk.gov.fcp.sfd.notification.failure.validation',
        time: new Date('2025-01-08T11:00:00.000Z'),
        data: {
          correlationId: mockCommsRequest.id,
          statusDetails: {
            status: 'validation-failure',
            errors: [
              {
                error: 'ValidationError',
                message: 'Invalid field'
              }
            ]
          }
        },
        datacontenttype: 'application/json',
        specversion: '1.0'
      })
    )
  })

  test('should log an error if publish fails', async () => {
    const message = { id: '9F37DA7E-4422-40C6-983C-85F692477BE6', type: 'some-event' }
    const errors = { details: [{ message: 'Invalid field' }] }

    publish.mockRejectedValue(new Error('Publish error'))

    await publishInvalidRequest(message, errors)

    expect(mockLogger.error).toHaveBeenCalledWith('Error publishing invalid request to SNS: Publish error')
  })

  afterAll(() => {
    vi.useRealTimers()
  })
})
