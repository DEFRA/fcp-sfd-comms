import { afterAll, beforeAll, beforeEach, describe, expect, test, jest } from '@jest/globals'
import v3 from '../../mocks/comms-request/v3.js'
import { getQueueSize, resetQueue, sendMessage } from '../../helpers/sqs.js'
import { clearCollection, getAllEntities } from '../../helpers/mongo.js'

const mockSendEmail = jest.fn().mockResolvedValue({ data: { id: '79389915-7275-457a-b8ca-8bf206b2e67b' } })
const mockGetNotificationById = jest.fn().mockResolvedValue({ data: { status: 'sent' } })

jest.unstable_mockModule('../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: mockSendEmail,
    getNotificationById: mockGetNotificationById
  }
}))

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

  test('should process valid comms message placed on sqs and send email via GOV Notify', async () => {
    mockSendEmail.mockResolvedValue({ data: { id: '79389915-7275-457a-b8ca-8bf206b2e67b' } })
    mockGetNotificationById.mockResolvedValue({ data: { status: 'sent' } })

    await sendMessage(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      JSON.stringify(v3)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })

    expect(mockSendEmail).toHaveBeenCalledWith(
      v3.data.notifyTemplateId,
      'test@example.com',
      expect.objectContaining({
        personalisation: v3.data.personalisation,
        reference: v3.id,
        emailReplyToId: v3.data.emailReplyToId
      })
    )

    // add assert to check logger error hasn't been called

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

  test('should handle failure when sending email via GOV Notify', async () => {
    await sendMessage(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      JSON.stringify(v3)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })

    expect(mockLoggerError).toHaveBeenCalledWith('Failed to send email via GOV Notify: Notify service failure')

    const notification = await getAllEntities('notificationRequests', {
      'message.id': '79389915-7275-457a-b8ca-8bf206b2e67b'
    })

    expect(notification[0].status).toBe('INTERNAL_FAILURE')

    const size = await getQueueSize(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request'
    )
    expect(size.available).toBe(0)
  })

  test('should handle failure in checking notification status', async () => {
    await sendMessage(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      JSON.stringify(v3)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })

    expect(mockLoggerError).toHaveBeenCalledWith('Failed checking notification mock-id: Status check failure')

    const notification = await getAllEntities('notificationRequests', {
      'message.id': '79389915-7275-457a-b8ca-8bf206b2e67b'
    })

    expect(notification[0].status).toBe('SENDING')

    const size = await getQueueSize(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request'
    )
    expect(size.available).toBe(0)
  })

  afterAll(() => {
    stopMessaging()
  })
})
