import { describe, test, expect } from '@jest/globals'

import { UnprocessableMessageError } from '../../../../src/errors/message-errors.js'

import sqsMessage from '../../../mocks/aws/sqs-message.js'

import { parseSqsMessage } from '../../../../src/messaging/sqs/parse-message.js'

describe('sqs message parser', () => {
  test('sqs message should return message object', () => {
    const messageBody = parseSqsMessage(sqsMessage)

    expect(messageBody).toEqual({
      id: '79389915-7275-457a-b8ca-8bf206b2e67b',
      source: 'source-system',
      specversion: '1.0',
      type: 'uk.gov.fcp.sfd.notification.request',
      datacontenttype: 'application/json',
      time: '2023-10-17T14:48:00.000Z',
      data: {
        crn: 1234567890,
        sbi: 123456789,
        sourceSystem: 'source',
        notifyTemplateId: 'd29257ce-974f-4214-8bbe-69ce5f2bb7f3',
        commsType: 'email',
        commsAddresses: 'test@example.com',
        personalisation: {
          reference: 'test-reference'
        },
        reference: 'email-reference',
        oneClickUnsubscribeUrl: 'https://unsubscribe.example.com',
        emailReplyToId: 'f824cbfa-f75c-40bb-8407-8edb0cc469d3'
      }
    })
  })

  test('invalid message body should throw unprocessable message', () => {
    const messageBody = {
      MessageId: '92f0175e-26c7-4902-80bf-42f0ca9e0969',
      Body: '{]'
    }

    expect(() => parseSqsMessage(messageBody)).toThrow(UnprocessableMessageError)
  })
})
