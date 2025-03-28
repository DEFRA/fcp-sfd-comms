import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import mockCommsRequest from '../../../../../mocks/comms-request/v3.js'

const mockSendEmail = jest.fn()
const mockGetNotificationById = jest.fn()
const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: mockSendEmail,
    getNotificationById: mockGetNotificationById
  }
}))

jest.unstable_mockModule('../../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

const { trySendViaNotify } = await import('../../../../../../src/messaging/inbound/comms-request/notify-service/try-send-via-notify.js')

describe('Try sending emails via GOV.UK Notify', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send email successfully', async () => {
    const mockResponse = { data: { id: 'mock-id' } }
    mockSendEmail.mockResolvedValue(mockResponse)
    const data = mockCommsRequest.data

    const [response, error] = await trySendViaNotify(data.notifyTemplateId, data.commsAddresses, {
      personalisation: data.personalisation,
      reference: data.reference
    })

    expect(mockSendEmail).toHaveBeenCalledWith(
      data.notifyTemplateId,
      data.commsAddresses,
      {
        personalisation: data.personalisation,
        reference: data.reference
      }
    )
    expect(response).toEqual(mockResponse)
    expect(error).toBeNull()
  })

  test('should handle errors when sending email fails', async () => {
    const mockError = {
      response: {
        status: 400,
        data: {
          error: {
            status_code: 400,
            errors: [
              {
                error: 'mock-error'
              }
            ]
          }
        }
      }
    }

    mockSendEmail.mockRejectedValue(mockError)

    const data = mockCommsRequest.data

    const [response, error] = await trySendViaNotify(data.notifyTemplateId, data.commsAddresses, {
      personalisation: data.personalisation,
      reference: data.reference
    })

    expect(mockSendEmail).toHaveBeenCalledWith(
      data.notifyTemplateId,
      data.commsAddresses,
      {
        personalisation: data.personalisation,
        reference: data.reference
      }
    )

    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to send email via GOV Notify. Error code: 400'
    )
    expect(response).toBeNull()
    expect(error).toEqual(mockError.response)
  })
})
