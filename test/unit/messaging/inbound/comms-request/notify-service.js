import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import mockCommsRequest from '../../../../mocks/comms-request/v3.js'

const mockSendEmail = jest.fn()

jest.unstable_mockModule('../../../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: mockSendEmail
  }
}))

const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    error: (...args) => mockLoggerError(...args)
  })
}))

const { notifyService } = await import('../../../../../src/messaging/inbound/comms-request/notify-service.js')

describe('Notify Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send email successfully', async () => {
    const mockResponse = { id: 'mock-id' }

    mockSendEmail.mockResolvedValue(mockResponse)

    const data = mockCommsRequest.data

    const [response, error] = await notifyService(data.notifyTemplateId, data.commsAddresses, {
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
    const mockError = new Error('Failed to send email')

    mockSendEmail.mockRejectedValue(mockError)

    const data = mockCommsRequest.data

    const [response, error] = await notifyService(data.notifyTemplateId, data.commsAddresses, {
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
      'Failed to send email via GOV Notify: Failed to send email'
    )
    expect(response).toBeNull()
    expect(error).toEqual(mockError)
  })
})
