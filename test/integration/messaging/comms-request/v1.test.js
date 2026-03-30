import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import v1 from '../../../mocks/comms-request/v1.js'

import { getAllEntities, clearCollection } from '../../../helpers/mongo.js'
import { getMessages, parseSqsMessage, resetQueue, sendMessage } from '../../../helpers/sqs.js'

import notifyClient from '../../../../src/notify/notify-client.js'

import { createLogger } from '../../../../src/logging/logger.js'
import { startMessaging, stopMessaging } from '../../../../src/messaging/inbound/inbound.js'
import { checkNotifyStatusHandler } from '../../../../src/jobs/check-notify-status/handler.js'
import { snsClient } from '../../../../src/messaging/sns/client.js'
import { config } from '../../../../src/config/index.js'
import { ListSubscriptionsByTopicCommand } from '@aws-sdk/client-sns'

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
    error: vi.fn(),
    debug: vi.fn(),
    isLevelEnabled: vi.fn().mockReturnValue(false)
  })
}))

const commsRequestQueueUrl = process.env.COMMS_REQUEST_QUEUE_URL
const commsRequestDlqUrl = process.env.COMMS_REQUEST_DEAD_LETTER_QUEUE_URL
const fdmQueueUrl = process.env.FDM_QUEUE_URL
const commEventsTopicArn = config.get('messaging.commEvents.topicArn')
const fdmQueueArn = `arn:aws:sqs:${process.env.AWS_REGION}:000000000000:fcp_fdm_events`

const mockLogger = createLogger('test')

const wait = async (ms) => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const waitForSubscription = async ({ topicArn, queueArn, timeoutMs = 60000, intervalMs = 1000 }) => {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const response = await snsClient.send(new ListSubscriptionsByTopicCommand({
      TopicArn: topicArn
    }))

    const hasSubscription = response.Subscriptions?.some((subscription) => subscription.Endpoint === queueArn)

    if (hasSubscription) {
      return
    }

    await wait(intervalMs)
  }

  throw new Error(`Timed out waiting for SNS subscription ${topicArn} -> ${queueArn}`)
}

describe('v1 comms request processing integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    await clearCollection('notificationRequests')

    await resetQueue(commsRequestQueueUrl)
    await resetQueue(commsRequestDlqUrl)
    await resetQueue(fdmQueueUrl)

    await waitForSubscription({
      topicArn: commEventsTopicArn,
      queueArn: fdmQueueArn
    })

    startMessaging()
  }, 70000)

  test('should process a valid v1 comms request', async () => {
    notifyClient.sendEmail.mockResolvedValue({
      data: {
        id: '79389915-7275-457a-b8ca-8bf206b2e67b',
        content: {
          subject: 'An update about your application',
          body: '# The email body in markdown'
        }
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

    await checkNotifyStatusHandler()

    const requests = await getAllEntities('notificationRequests', {
      'message.id': mockMessage.id
    })

    expect(requests).toHaveLength(1)
    expect(requests[0].statusDetails.status).toBe('delivered')
    expect(requests[0].message).toEqual(mockMessage)

    const events = await getMessages(fdmQueueUrl)

    const parsedEvents = events.map((event) => parseSqsMessage(event))

    expect(parsedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          source: 'fcp-sfd-comms',
          time: expect.any(String),
          type: 'uk.gov.fcp.sfd.notification.received',
          data: {
            ...mockMessage.data,
            correlationId: '15df79e7-806e-4c85-9372-a2e256a1d597'
          },
          datacontenttype: 'application/json',
          specversion: '1.0'
        }),
        expect.objectContaining({
          id: expect.any(String),
          source: 'fcp-sfd-comms',
          time: expect.any(String),
          type: 'uk.gov.fcp.sfd.notification.sending',
          data: {
            correlationId: '15df79e7-806e-4c85-9372-a2e256a1d597',
            recipient: 'test@example.com',
            statusDetails: {
              status: 'sending'
            },
            content: {
              subject: 'An update about your application',
              body: '# The email body in markdown'
            }
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
