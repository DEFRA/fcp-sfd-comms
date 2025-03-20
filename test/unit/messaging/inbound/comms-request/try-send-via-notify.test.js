import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import { trySendViaNotify } from '../../../../../../src/messaging/inbound/comms-request/try-send-via-notify.js'

const mockSendEmail = jest.fn()

jest.unstable_mockModule('../../../../../notify/notify-client.js', () => ({
  default: {
    sendEmail: mockSendEmail
  }
}))

describe('trySendViaNotify', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send email successfully', async () => {
    const mockResponse = { id: 'email-response-id' }
    mockSendEmail.mockResolvedValue(mockResponse)

    const message = {
      data: {
        notifyTemplateId: 'template-123',
        personalisation: { name: 'John Doe' }
      },
      correlationId: 'correlation-456',
      id: 'message-789'
    }

    const emailAddress = 'test@example.com'

    const [response, error] = await trySendViaNotify(message, emailAddress)

    expect(mockSendEmail).toHaveBeenCalledWith(
      'template-123',
      'test@example.com',
      {
        personalisation: { name: 'John Doe' },
        reference: 'correlation-456'
      }
    )
    expect(response).toEqual(mockResponse)
    expect(error).toBeNull()
  })

  test('should handle errors when sending email fails', async () => {
    const mockError = new Error('Failed to send email')
    mockSendEmail.mockRejectedValue(mockError)

    const message = {
      data: {
        notifyTemplateId: 'template-123',
        personalisation: { name: 'John Doe' }
      },
      id: 'message-789'
    }

    const emailAddress = 'test@example.com'

    const [response, error] = await trySendViaNotify(message, emailAddress)

    expect(mockSendEmail).toHaveBeenCalledWith(
      'template-123',
      'test@example.com',
      {
        personalisation: { name: 'John Doe' },
        reference: 'message-789'
      }
    )
    expect(response).toBeNull()
    expect(error).toEqual(mockError)
  })
})
