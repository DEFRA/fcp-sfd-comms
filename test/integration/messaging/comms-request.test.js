import { afterAll, beforeAll, beforeEach, describe, expect, test, jest } from '@jest/globals'

import v3 from '../../mocks/comms-request/v3.js'

import { getQueueSize, resetQueue, sendMessage } from '../../helpers/sqs.js'
import { clearCollection, getAllEntities } from '../../helpers/mongo.js'

jest.setTimeout(60000)

const mockLoggerInfo = jest.fn()
const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

const { startMessaging, stopMessaging } = await import('../../../src/messaging/inbound/inbound.js')

describe('comms request consumer integration', () => {
  beforeAll(() => {
    startMessaging()
  })

  beforeEach(async () => {
    jest.clearAllMocks()

    await resetQueue('http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request')
    await resetQueue('http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request-deadletter')

    await clearCollection('notificationRequests')
  })

  test('should process valid comms message placed on sqs', async () => {
    await sendMessage(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      JSON.stringify(v3)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })

    expect(mockLoggerInfo).toHaveBeenCalledWith('Comms V3 request processed successfully, eventId: 79389915-7275-457a-b8ca-8bf206b2e67b')

    const notification = await getAllEntities('notificationRequests', {
      'message.id': '79389915-7275-457a-b8ca-8bf206b2e67b'
    })

    expect(notification).toHaveLength(1)

    const size = await getQueueSize(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request'
    )

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

    expect(notification).toHaveLength(0)

    expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Invalid comms V3 payload:'))
    expect(mockLoggerError).toHaveBeenCalledWith('Error processing message: Invalid message')
    expect(mockLoggerInfo).toHaveBeenCalledWith('Moving unprocessable message to dead letter queue')

    const size = await getQueueSize(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request-deadletter'
    )

    expect(size.available).toBe(1)
  })

  afterAll(() => {
    stopMessaging()
  })
})
