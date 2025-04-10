import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals'

import v3 from '../../../../mocks/comms-request/v3.js'

const mockSendMessageCommand = jest.fn()

jest.unstable_mockModule('@aws-sdk/client-sqs', () => ({
  SendMessageCommand: mockSendMessageCommand
}))

const mockSqsClient = {
  send: jest.fn()
}

jest.unstable_mockModule('../../../../../src/messaging/sqs/client.js', () => ({
  sqsClient: mockSqsClient
}))

const { publishRetryRequest } = await import('../../../../../src/messaging/outbound/notification-retry/notification-retry.js')

describe('notification retry publish', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  test('should send retry request with minutes delay converted to seconds', async () => {
    const cryptoSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf')

    jest.setSystemTime(new Date('2024-11-18T15:00:00.000Z'))

    await publishRetryRequest(v3, 'test@example.com', 15)

    expect(mockSendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      DelaySeconds: 900
    }))

    expect(mockSqsClient.send).toHaveBeenCalledTimes(1)

    cryptoSpy.mockRestore()
  })

  test('should send retry request to correct queue', async () => {
    jest.setSystemTime(new Date('2024-11-18T15:00:00.000Z'))

    await publishRetryRequest(v3, 'test@example.com', 15)

    expect(mockSendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      QueueUrl: 'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request'
    }))

    expect(mockSqsClient.send).toHaveBeenCalledTimes(1)
  })

  test('should send retry correct using message id as correlation id', async () => {
    jest.setSystemTime(new Date('2024-11-18T15:00:00.000Z'))

    const cryptoSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf')

    await publishRetryRequest(v3, 'test@example.com', 15)

    expect(mockSendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      MessageBody: JSON.stringify({
        ...v3,
        id: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf',
        type: 'uk.gov.fcp.sfd.notification.retry',
        time: new Date('2024-11-18T15:00:00.000Z'),
        data: {
          ...v3.data,
          correlationId: v3.id,
          commsAddresses: 'test@example.com'
        }
      })
    }))

    expect(mockSqsClient.send).toHaveBeenCalledTimes(1)

    cryptoSpy.mockRestore()
  })

  test('should send retry request with correlation id', async () => {
    jest.setSystemTime(new Date('2024-11-18T15:00:00.000Z'))

    const cryptoSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf')

    const mockMessage = {
      ...v3,
      data: {
        ...v3.data,
        correlationId: 'c5adb509-a25f-430e-a439-e22dc3e7e166'
      }
    }

    await publishRetryRequest(mockMessage, 'test@example.com', 15)

    expect(mockSendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      MessageBody: JSON.stringify({
        ...v3,
        id: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf',
        type: 'uk.gov.fcp.sfd.notification.retry',
        time: new Date('2024-11-18T15:00:00.000Z'),
        data: {
          ...v3.data,
          correlationId: 'c5adb509-a25f-430e-a439-e22dc3e7e166',
          commsAddresses: 'test@example.com'
        }
      })
    }))

    expect(mockSqsClient.send).toHaveBeenCalledTimes(1)

    cryptoSpy.mockRestore()
  })

  test('should wrap error on sqs failure', async () => {
    const mockError = new Error('test error')

    mockSqsClient.send.mockRejectedValue(mockError)

    await expect(publishRetryRequest(v3, 'test@example.com', 15)).rejects.toMatchObject({
      message: expect.stringContaining('Error publishing retry message'),
      cause: mockError
    })
  })

  afterAll(() => {
    jest.useRealTimers()
  })
})
