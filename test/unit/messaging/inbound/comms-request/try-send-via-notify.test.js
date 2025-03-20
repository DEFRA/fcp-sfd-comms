import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import mockCommsRequest from '../../../../mocks/comms-request/v3.js'

const mockSendEmail = jest.fn()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { })

jest.unstable_mockModule('../../../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: mockSendEmail
  }
}))

const { trySendViaNotify } = await import('../../../../../src/messaging/inbound/comms-request/try-send-via-notify.js')

describe('trySendViaNotify', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send email successfully', async () => {
    const mockResponse = { id: 'mock-id' }
    mockSendEmail.mockResolvedValue(mockResponse)

    const emailAddress = mockCommsRequest.data.commsAddresses

    const [response, error] = await trySendViaNotify(mockCommsRequest.data, emailAddress)

    expect(mockSendEmail).toHaveBeenCalledWith(
      mockCommsRequest.data.notifyTemplateId,
      emailAddress,
      {
        personalisation: mockCommsRequest.data.personalisation,
        reference: mockCommsRequest.data.reference
      }
    )

    expect(response).toEqual(mockResponse)
    expect(error).toBeNull()
  })

  test('should handle errors when sending email fails', async () => {
    const mockError = new Error('Failed to send email')
    mockSendEmail.mockRejectedValue(mockError)

    const emailAddress = mockCommsRequest.data.commsAddresses

    const [response, error] = await trySendViaNotify(mockCommsRequest.data, emailAddress)

    expect(mockSendEmail).toHaveBeenCalledWith(
      mockCommsRequest.data.notifyTemplateId,
      emailAddress,
      {
        personalisation: mockCommsRequest.data.personalisation,
        reference: mockCommsRequest.data.reference
      }
    )

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Failed to send email via GOV Notify. Error:',
      mockError
    )
    expect(response).toBeNull()
    expect(error).toEqual(mockError)
  })
})
