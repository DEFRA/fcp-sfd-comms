import { vi, describe, test, expect, beforeEach } from 'vitest'

import mockCommsRequest from '../../../../../mocks/comms-request/v1.js'

import notifyClient from '../../../../../../src/notify/notify-client.js'

import { createLogger } from '../../../../../../src/logging/logger.js'

import { trySendViaNotify } from '../../../../../../src/messaging/inbound/comms-request/notify-service/try-send-via-notify.js'

vi.mock('../../../../../../src/notify/notify-client.js', () => ({
  default: {
    sendEmail: vi.fn(),
    getNotificationById: vi.fn()
  }
}))

vi.mock('../../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()

describe('Try sending emails via GOV.UK Notify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should send email successfully', async () => {
    const mockResponse = { data: { id: 'mock-id' } }
    notifyClient.sendEmail.mockResolvedValue(mockResponse)
    const data = mockCommsRequest.data

    const [response, error] = await trySendViaNotify(data.notifyTemplateId, data.recipient, {
      personalisation: data.personalisation,
      reference: data.reference
    })

    expect(notifyClient.sendEmail).toHaveBeenCalledWith(
      data.notifyTemplateId,
      data.recipient,
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

    notifyClient.sendEmail.mockRejectedValue(mockError)

    const data = mockCommsRequest.data

    const [response, error] = await trySendViaNotify(data.notifyTemplateId, data.recipient, {
      personalisation: data.personalisation,
      reference: data.reference
    })

    expect(notifyClient.sendEmail).toHaveBeenCalledWith(
      data.notifyTemplateId,
      data.recipient,
      {
        personalisation: data.personalisation,
        reference: data.reference
      }
    )

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to send email via GOV Notify. Error code: 400'
    )
    expect(response).toBeNull()
    expect(error).toEqual(mockError.response)
  })
})
