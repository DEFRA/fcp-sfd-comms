import { describe, expect, vi, test } from 'vitest'

import { debugLog } from '../../../src/utils/debug-log'
import { createLogger } from '../../../src/logging/logger.js'

vi.mock('../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })
}))

const mockLogger = createLogger()

const mockReceivedMessage = {
  id: '123e4567-e89b-12d3-a456-426655440000',
  source: 'ffc-ahwr-claim',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.received',
  datacontenttype: 'application/json',
  time: '2023-10-17T14:48:00Z',
  data: {
    correlationId: '123e4567-e89b-12d3-a456-426655440000',
    crn: 1234567890,
    sbi: 123456789,
    sourceSystem: 'ahwp',
    notifyTemplateId: 'f33517ff-2a88-4f6e-b855-c550268ce08a',
    commsType: 'email',
    recipient: 'example-customer1@example.com',
    personalisation: {
      caseNumber: 'ACC123456789',
      expectedPaymentDate: '21.11.2025',
      adminName: 'Jessica Lrrr'
    },
    reference: 'ffc-ahwr-reference',
    oneClickUnsubscribeUrl: 'https://unsubscribe.example.com',
    emailReplyToId: '8e222534-7f05-4972-86e3-17c5d9f894e2'
  }
}

const mockSendingMessage = {
  id: '123e4567-e89b-12d3-a456-426655440000',
  source: 'ffc-ahwr-claim',
  specversion: '1.0',
  type: 'uk.gov.fcp.sfd.notification.sending',
  datacontenttype: 'application/json',
  time: '2023-10-17T14:48:00Z',
  data: {
    statusDetails: '',
    content: {
      subject: 'subject',
      body: 'body'
    }
  }
}

describe('When using the debug logger util', () => {
  describe('with a valid message', () => {
    test('it should redact the recipient', () => {
      debugLog(mockReceivedMessage)

      const result = mockLogger.debug.mock.calls[0][0]

      expect(result.data.recipient).toBe('redacted')
    })

    test('it should redact personalisation keys if present', () => {
      debugLog(mockReceivedMessage)

      const result = mockLogger.debug.mock.calls[1][0]

      expect(result.data.personalisation).toBe('redacted')
      expect(result.data.personalisation.expectedPaymentDate).toBe(undefined)
      expect(result.data.personalisation.adminName).toBe(undefined)
    })

    test('it should redact content keys if present', () => {
      debugLog(mockSendingMessage)

      const result = mockLogger.debug.mock.calls[2][0]

      expect(result.data.content).toBe('redacted')
      expect(result.data.content.subject).toBe(undefined)
      expect(result.data.content.body).toBe(undefined)
    })
  })

  describe('with an invalid message', () => {
    test('it should log a warning message with no message content', () => {
      debugLog({ type: 'not-valid' })
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid message format for debug logger. Debug log not executed.')
    })
  })
})
