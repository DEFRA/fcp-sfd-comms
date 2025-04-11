import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

import v3 from '../../mocks/comms-request/v3.js'

import { getQueueSize, resetQueue, sendMessage } from '../../helpers/sqs.js'
import { clearCollection, getAllEntities } from '../../helpers/mongo.js'

import notifyClient from '../../../src/notify/notify-client.js'

import { createLogger } from '../../../src/logging/logger.js'
import { startMessaging, stopMessaging } from '../../../src/messaging/inbound/inbound.js'

vi.mock('../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: vi.fn(),
    getNotificationById: vi.fn()
  }
}))

vi.mock('../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()

describe('comms request consumer integration', () => {
  beforeAll(() => {
    startMessaging()
  })

  beforeEach(async () => {
    vi.clearAllMocks()

    await resetQueue('http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request')
    await resetQueue('http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request-deadletter')

    await clearCollection('notificationRequests')
  })

  test('should process valid V3 comms message placed on SQS', async () => {
    notifyClient.sendEmail.mockResolvedValue({ data: { id: '79389915-7275-457a-b8ca-8bf206b2e67b' } })
    notifyClient.getNotificationById.mockResolvedValue({ data: { status: 'delivered' } })

    await sendMessage(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      JSON.stringify(v3)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })

    const notification = await getAllEntities('notificationRequests', {
      'message.id': '79389915-7275-457a-b8ca-8bf206b2e67b'
    })

    const size = await getQueueSize(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request'
    )

    expect(mockLogger.info).toHaveBeenCalledWith('Comms V3 request processed successfully, eventId: 79389915-7275-457a-b8ca-8bf206b2e67b')

    expect(notifyClient.sendEmail).toHaveBeenCalledWith(
      'd29257ce-974f-4214-8bbe-69ce5f2bb7f3',
      'test@example.com',
      expect.objectContaining({
        personalisation: { reference: 'test-reference' },
        emailReplyToId: 'f824cbfa-f75c-40bb-8407-8edb0cc469d3'
      })
    )

    expect(notifyClient.getNotificationById).toHaveBeenCalledTimes(1)

    expect(notification).toHaveLength(1)

    expect(size.available).toBe(0)
  })

  test('should not process invalid comms message', async () => {
    const message = {
      ...v3,
      id: 'invalid',
      data: {
        ...v3.data,
        commsAddresses: undefined
      }
    }

    await sendMessage(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      JSON.stringify(message)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })

    const notification = await getAllEntities('notificationRequests', {
      'message.id': 'invalid'
    })

    const size = await getQueueSize(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request'
    )

    expect(notification).toHaveLength(0)

    expect(mockLogger.error).toHaveBeenCalledWith('Invalid comms V3 payload: "id" must be a valid GUID,"data.commsAddresses" is required')

    expect(size.available).toBe(0)
  })

  afterAll(async () => {
    stopMessaging()
    await clearCollection('notificationRequests')
  })
}, 60000)
