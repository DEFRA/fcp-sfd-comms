import { afterAll, beforeEach, describe, expect, vi, test } from 'vitest'

import mockCommsRequest from '../../../../mocks/comms-request/v1.js'

import { createLogger } from '../../../../../src/logging/logger.js'
import { snsClient } from '../../../../../src/messaging/sns/client.js'
import { publish } from '../../../../../src/messaging/sns/publish.js'
import { publishRetryExpired } from '../../../../../src/messaging/outbound/retry-expired/publish-expired.js'

vi.mock('../../../../../src/messaging/sns/publish.js')

vi.mock('../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()

describe('Publish retry expired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))
  })

  test('should publish an retry expiry event', async () => {
    const mockMessage = {
      ...mockCommsRequest,
      data: {
        ...mockCommsRequest.data,
        recipient: 'test@example.com',
        correlationId: '92145216-a3de-45a3-86e6-09cbece4c6a8'
      }
    }

    await publishRetryExpired(mockMessage, 'test@example.com')

    expect(publish).toHaveBeenCalledWith(
      snsClient,
      'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_comm_events',
      expect.objectContaining({
        id: expect.any(String),
        source: 'fcp-sfd-comms',
        type: 'uk.gov.fcp.sfd.notification.retry.expired',
        time: new Date('2025-01-08T11:00:00.000Z'),
        data: {
          correlationId: '92145216-a3de-45a3-86e6-09cbece4c6a8',
          recipient: 'test@example.com'
        },
        datacontenttype: 'application/json',
        specversion: '1.0'
      })
    )
  })

  test('should log error if publish fails', async () => {
    const mockError = new Error('Publish error')

    publish.mockRejectedValue(mockError)

    await publishRetryExpired({}, 'test@example.com')

    expect(mockLogger.error).toHaveBeenCalledWith(
      mockError,
      'Error publishing comms request retry expiry event'
    )
  })

  afterAll(() => {
    vi.useRealTimers()
  })
})
