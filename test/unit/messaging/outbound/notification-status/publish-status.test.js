import { beforeEach, describe, expect, vi, test, afterAll } from 'vitest'
import { createLogger } from '../../../../../src/logging/logger.js'
import mockCommsRequest from '../../../../mocks/comms-request/v3.js'
import { snsClient } from '../../../../../src/messaging/sns/client.js'
import { publish } from '../../../../../src/messaging/sns/publish.js'
import { publishStatus } from '../../../../../src/messaging/outbound/notification-status/publish-status.js'
import { statusToEventMap } from '../../../../../src/constants/comms-events.js'

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

  test('should publish a status message with correct type and details', async () => {
    const recipient = 'test@example.com'
    const status = 'DELIVERED'
    const error = null

    await publishStatus(mockCommsRequest, recipient, status, error)

    expect(publish).toHaveBeenCalledWith(
      snsClient,
      'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      expect.objectContaining({
        id: expect.any(String),
        source: 'fcp-sfd-comms',
        type: statusToEventMap[status],
        time: new Date('2025-01-08T11:00:00.000Z'),
        data: {
          correlationId: mockCommsRequest.id,
          commsAddresses: recipient,
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

  test('should publish a status message with error details if error is provided', async () => {
    const recipient = 'test@example.com'
    const status = 'FAILED'
    const error = { status_code: 500, errors: ['Internal Server Error'] }

    await publishStatus(mockCommsRequest, recipient, status, error)

    expect(publish).toHaveBeenCalledWith(
      snsClient,
      'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      expect.objectContaining({
        id: expect.any(String),
        source: 'fcp-sfd-comms',
        type: statusToEventMap[status],
        time: new Date('2025-01-08T11:00:00.000Z'),
        data: {
          correlationId: mockCommsRequest.id,
          commsAddresses: recipient,
          statusDetails: {
            status,
            errorCode: 500,
            errors: ['Internal Server Error']
          }
        },
        datacontenttype: 'application/json',
        specversion: '1.0'
      })
    )
  })

  test('should log an error if publish fails', async () => {
    const recipient = 'test@example.com'
    const status = 'DELIVERED'
    const error = null

    publish.mockRejectedValue(new Error('Publish error'))

    await publishStatus(mockCommsRequest, recipient, status, error)

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
