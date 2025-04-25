import { beforeEach, describe, expect, vi, test } from 'vitest'

import mockCommsRequest from '../../../../mocks/comms-request/v1.js'

import { createLogger } from '../../../../../src/logging/logger.js'
import { snsClient } from '../../../../../src/messaging/sns/client.js'
import { publish } from '../../../../../src/messaging/sns/publish.js'
import { publishReceivedMessage } from '../../../../../src/messaging/outbound/received-request/publish-received.js'

vi.mock('../../../../../src/messaging/sns/publish.js')

vi.mock('../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()

describe('Publish Received Message', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-08T11:00:00.000Z'))
  })

  test('should publish a received message with RECEIVED if message type is RECEIVED', async () => {
    await publishReceivedMessage(mockCommsRequest)

    expect(publish).toHaveBeenCalledWith(
      snsClient,
      'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      expect.objectContaining({
        id: expect.any(String),
        source: 'fcp-sfd-comms',
        type: 'uk.gov.fcp.sfd.notification.received',
        time: new Date('2025-01-08T11:00:00.000Z'),
        data: {
          correlationId: mockCommsRequest.id
        },
        datacontenttype: 'application/json',
        specversion: '1.0'
      })
    )
  })

  test('should publish a received message with RETRY type if message type is RETRY', async () => {
    const receivedMessage = { ...mockCommsRequest, type: 'uk.gov.fcp.sfd.notification.retry' }

    await publishReceivedMessage(receivedMessage)

    expect(publish).toHaveBeenCalledWith(
      snsClient,
      'arn:aws:sns:eu-west-2:000000000000:fcp_sfd_data.fifo',
      expect.objectContaining({
        id: expect.any(String),
        source: 'fcp-sfd-comms',
        type: 'uk.gov.fcp.sfd.notification.retry',
        time: new Date('2025-01-08T11:00:00.000Z'),
        data: {
          correlationId: mockCommsRequest.id
        },
        datacontenttype: 'application/json',
        specversion: '1.0'
      })
    )
  })

  test('should log an error if publish fails', async () => {
    const message = { ...mockCommsRequest, type: 'uk.gov.fcp.sfd.notification.failure.validation' }

    publish.mockRejectedValue(new Error('Publish error'))

    await publishReceivedMessage(message)

    expect(mockLogger.error).toHaveBeenCalledWith('Error publishing received message to SNS:', expect.objectContaining({ cause: expect.any(Error) }))
  })
})
