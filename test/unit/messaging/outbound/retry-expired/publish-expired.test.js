import { afterAll, beforeEach, describe, expect, vi, test } from 'vitest'

import v3CommsRequest from '../../../../mocks/comms-request/v3.js'

import { snsClient } from '../../../../../src/messaging/sns/client.js'
import { publish } from '../../../../../src/messaging/sns/publish.js'
import { publishRetryExpired } from '../../../../../src/messaging/outbound/retry-expired/publish-expired.js'

const mockLoggerError = vi.fn()

vi.mock('../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

vi.mock('../../../../../src/messaging/sns/client.js', () => ({
  snsClient: {
    publish: vi.fn()
  }
}))

vi.mock('../../../../../src/messaging/sns/publish.js', () => ({
  publish: vi.fn()
}))

describe('Publish retry expired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should publish an retry expiry event', async () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))

    const mockMessage = {
      ...v3CommsRequest,
      data: {
        ...v3CommsRequest.data,
        commsAddresses: 'test@example.com',
        correlationId: '92145216-a3de-45a3-86e6-09cbece4c6a8'
      }
    }

    await publishRetryExpired(mockMessage, 'test@example.com')

    expect(publish).toHaveBeenCalledWith(
      snsClient,
      'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      expect.objectContaining({
        id: expect.any(String),
        source: 'fcp-sfd-comms',
        type: 'uk.gov.fcp.sfd.notification.retry.expired',
        time: new Date('2025-01-08T11:00:00.000Z'),
        data: {
          correlationId: '92145216-a3de-45a3-86e6-09cbece4c6a8',
          commsAddresses: 'test@example.com'
        },
        datacontenttype: 'application/json',
        specversion: '1.0'
      })
    )
  })

  test('should log an error if publish fails', async () => {
    publish.mockRejectedValue(new Error('Publish error'))

    await publishRetryExpired({}, 'test@example.com')

    expect(mockLoggerError).toHaveBeenCalledWith('Error publishing retry expiry to SNS: Publish error')
  })

  afterAll(() => {
    vi.useRealTimers()
  })
})
