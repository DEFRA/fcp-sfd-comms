import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import v1 from '../../../mocks/comms-request/v1.js'

import { getAllEntities, clearCollection } from '../../../helpers/mongo.js'
import { getMessages, parseSqsMessage, resetQueue, sendMessage } from '../../../helpers/sqs.js'

import notifyClient from '../../../../src/notify/notify-client.js'

import { createLogger } from '../../../../src/logging/logger.js'
import { startMessaging, stopMessaging } from '../../../../src/messaging/inbound/inbound.js'

vi.mock('../../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: vi.fn(),
    getNotificationById: vi.fn()
  }
}))

vi.mock('../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const commsRequestQueueUrl = process.env.COMMS_REQUEST_QUEUE_URL
const commsRequestDlqUrl = process.env.COMMS_REQUEST_DEAD_LETTER_QUEUE_URL
const dataIngestQueueUrl = process.env.DAL_INGEST_QUEUE_URL

const mockLogger = createLogger('test')

describe('v1 comms request processing integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    await clearCollection('notificationRequests')

    await resetQueue(commsRequestQueueUrl)
    await resetQueue(commsRequestDlqUrl)
    await resetQueue(dataIngestQueueUrl)

    startMessaging()
  })

  test('should process a valid v1 comms request', async () => {
    notifyClient.sendEmail.mockResolvedValue({
      data: {
        id: '79389915-7275-457a-b8ca-8bf206b2e67b'
      }
    })

    notifyClient.getNotificationById.mockResolvedValue({
      data: {
        status: 'delivered'
      }
    })

    const mockMessage = {
      ...v1,
      id: '15df79e7-806e-4c85-9372-a2e256a1d597',
      data: {
        ...v1.data,
        recipient: 'test@example.com'
      }
    }

    await sendMessage(
      commsRequestQueueUrl,
      JSON.stringify(mockMessage)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 5000)
    })

    const requests = await getAllEntities('notificationRequests', {
      'message.id': mockMessage.id
    })

    expect(requests).toHaveLength(1)
    expect(requests[0].statusDetails.status).toBe('delivered')
    expect(requests[0].message).toEqual(mockMessage)

    const events = await getMessages(dataIngestQueueUrl)

    const parsedEvents = events.map((event) => parseSqsMessage(event))

    expect(parsedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          source: 'fcp-sfd-comms',
          time: expect.any(String),
          type: 'uk.gov.fcp.sfd.notification.received',
          data: {
            correlationId: '15df79e7-806e-4c85-9372-a2e256a1d597'
          },
          datacontenttype: 'application/json',
          specversion: '1.0'
        }),
        expect.objectContaining({
          id: expect.any(String),
          source: 'fcp-sfd-comms',
          time: expect.any(String),
          type: 'uk.gov.fcp.sfd.notification.delivered',
          data: {
            correlationId: '15df79e7-806e-4c85-9372-a2e256a1d597',
            recipient: 'test@example.com',
            statusDetails: {
              status: 'delivered'
            }
          },
          datacontenttype: 'application/json',
          specversion: '1.0'
        })
      ])
    )

    expect(mockLogger.info).toHaveBeenCalledWith('Comms V1 request processed successfully, eventId: 15df79e7-806e-4c85-9372-a2e256a1d597')
  })

  afterEach(async () => {
    stopMessaging()
  })

  afterAll(async () => {
    await clearCollection('notificationRequests')
  })
}, 60000)
