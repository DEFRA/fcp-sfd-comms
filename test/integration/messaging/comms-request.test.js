import { afterAll, beforeAll, beforeEach, describe, expect, test, jest } from '@jest/globals'
import v3 from '../../mocks/comms-request/v3.js'
import { getQueueSize, resetQueue, sendMessage } from '../../helpers/sqs.js'
import { clearCollection, getAllEntities } from '../../helpers/mongo.js'

jest.unstable_mockModule('../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: jest.fn(),
    getNotificationById: jest.fn()
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
    const mockSendEmail = jest.fn().mockResolvedValue({ data: { id: 'mock-id' } })
    const mockGetNotificationById = jest.fn().mockResolvedValue({ data: { status: 'sent' } })

    const { default: notifyClient } = await import('../../../src/notify/notify-client.js')
    notifyClient.sendEmail = sendEmailMock
    notifyClient.getNotificationById = mockGetNotificationById

    await sendMessage(
      'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request',
      JSON.stringify(v3)
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })

    expect(sendEmailMock).toHaveBeenCalledWith(
      v3.data.notifyTemplateId,
      v3.data.commsAddresses[0],
      expect.objectContaining({
        personalisation: v3.data.personalisation,
        reference: v3.id,
        emailReplyToId: v3.data.emailReplyToId
      })
    )

    expect(mockGetNotificationById).toHaveBeenCalledWith('mock-id')

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
    const mockSendEmail = jest.fn().mockRejectedValue(new Error('Notify service failure'))
    const mockGetNotificationById = jest.fn().mockResolvedValue({ data: { status: 'failed' } })

    const { default: notifyClient } = await import('../../../src/notify/notify-client.js')
    notifyClient.sendEmail = sendEmailMock
    notifyClient.getNotificationById = mockGetNotificationById

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
    const mockSendEmail = jest.fn().mockResolvedValue({ data: { id: 'mock-id' } })
    const mockGetNotificationById = jest.fn().mockRejectedValue(new Error('Status check failure'))

    const { default: notifyClient } = await import('../../../src/notify/notify-client.js')
    notifyClient.sendEmail = sendEmailMock
    notifyClient.getNotificationById = mockGetNotificationById

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
