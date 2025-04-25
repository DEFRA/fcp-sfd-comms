import { beforeEach, describe, expect, vi, test, afterAll } from 'vitest'

import mockCommsRequest from '../../../../mocks/comms-request/v1.js'

import { createLogger } from '../../../../../src/logging/logger.js'
import { snsClient } from '../../../../../src/messaging/sns/client.js'
import { publish } from '../../../../../src/messaging/sns/publish.js'
import { publishStatus } from '../../../../../src/messaging/outbound/notification-status/publish-status.js'

vi.mock('../../../../../src/messaging/sns/publish.js')

vi.mock('../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()

describe('Publish Status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))
  })

  test.each([
    ['created', 'uk.gov.fcp.sfd.notification.sending'],
    ['sending', 'uk.gov.fcp.sfd.notification.sending'],
    ['permanent-failure', 'uk.gov.fcp.sfd.notification.failure.provider'],
    ['temporary-failure', 'uk.gov.fcp.sfd.notification.failure.provider'],
    ['technical-failure', 'uk.gov.fcp.sfd.notification.failure.provider'],
    ['delivered', 'uk.gov.fcp.sfd.notification.delivered']
  ])('should publish %s event for non-error status %s', async (status, expectedType) => {
    const recipient = 'test@example.com'

    await publishStatus(mockCommsRequest, recipient, status)

    expect(publish).toHaveBeenCalledWith(
      snsClient,
      'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      expect.objectContaining({
        id: expect.any(String),
        source: 'fcp-sfd-comms',
        type: expectedType,
        time: new Date('2025-01-08T11:00:00.000Z'),
        data: {
          correlationId: mockCommsRequest.id,
          recipient,
          statusDetails: {
            status,
            errorCode: undefined,
            errors: undefined
          }
        },
        datacontenttype: 'application/json',
        specversion: '1.0'
      })
    )
  })

  test.each([
    ['internal-failure', 'uk.gov.fcp.sfd.notification.failure.internal'],
    ['validation-failure', 'uk.gov.fcp.sfd.notification.failure.validation']
  ])('should publish %s event for error status %s', async (status, expectedType) => {
    const recipient = 'test@example.com'
    
    const mockError = {
      response: {
        status: 400,
        data: {
          error: {
            status_code: 400,
            errors: [
              {
                error: 'mock-error'
              }
            ]
          }
        }
      }
    }

    await publishStatus(mockCommsRequest, recipient, status, mockError)

    expect(publish).toHaveBeenCalledWith(
      snsClient,
      'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      expect.objectContaining({
        id: expect.any(String),
        source: 'fcp-sfd-comms',
        type: expectedType,
        time: new Date('2025-01-08T11:00:00.000Z'),
        data: {
          correlationId: mockCommsRequest.id,
          recipient,
          statusDetails: {
            status,
            errorCode: 400,
            errors: ['Bad Request']
          }
        },
        datacontenttype: 'application/json',
        specversion: '1.0'
      })
    )
  })

  test('should log an error if publish fails', async () => {
    const recipient = 'test@example.com'

    publish.mockRejectedValue(new Error('Publish error'))

    await publishStatus(mockCommsRequest, recipient, 'delivered')

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error publishing comms event status details to SNS:',
      {
        cause: new Error('Publish error')
      }
    )
  })

  afterAll(() => {
    vi.useRealTimers()
  })
})
