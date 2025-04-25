import { afterAll, beforeEach, describe, expect, vi, test } from 'vitest'

import mockCommsRequest from '../../../../mocks/comms-request/v1.js'

import { SendMessageCommand } from '@aws-sdk/client-sqs'
import { sqsClient } from '../../../../../src/messaging/sqs/client.js'
import { publishRetryRequest } from '../../../../../src/messaging/outbound/notification-retry/notification-retry.js'

vi.mock('@aws-sdk/client-sqs')

vi.mock('../../../../../src/messaging/sqs/client.js', () => ({
  sqsClient: {
    send: vi.fn()
  }
}))

describe('notification retry publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-11-18T15:00:00.000Z'))
  })

  test('should send retry request with minutes delay converted to seconds', async () => {
    const cryptoSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf')

    await publishRetryRequest(mockCommsRequest, 'test@example.com', 15)

    expect(SendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      DelaySeconds: 900
    }))

    expect(sqsClient.send).toHaveBeenCalledTimes(1)

    cryptoSpy.mockRestore()
  })

  test('should send retry request to correct queue', async () => {
    await publishRetryRequest(mockCommsRequest, 'test@example.com', 15)

    expect(SendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      QueueUrl: 'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request'
    }))

    expect(sqsClient.send).toHaveBeenCalledTimes(1)
  })

  test('should send retry correct using message id as correlation id', async () => {
    const cryptoSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf')

    await publishRetryRequest(mockCommsRequest, 'test@example.com', 15)

    expect(SendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      MessageBody: JSON.stringify({
        ...mockCommsRequest,
        id: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf',
        type: 'uk.gov.fcp.sfd.notification.retry',
        time: new Date('2024-11-18T15:00:00.000Z'),
        data: {
          ...mockCommsRequest.data,
          correlationId: mockCommsRequest.id,
          recipient: 'test@example.com'
        }
      })
    }))

    expect(sqsClient.send).toHaveBeenCalledTimes(1)

    cryptoSpy.mockRestore()
  })

  test('should send retry request with correlation id', async () => {
    const cryptoSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf')

    const mockMessage = {
      ...mockCommsRequest,
      data: {
        ...mockCommsRequest.data,
        correlationId: 'c5adb509-a25f-430e-a439-e22dc3e7e166'
      }
    }

    await publishRetryRequest(mockMessage, 'test@example.com', 15)

    expect(SendMessageCommand).toHaveBeenCalledWith(expect.objectContaining({
      MessageBody: JSON.stringify({
        ...mockCommsRequest,
        id: 'a4ea0d13-ea7f-4f5b-9c4c-ce34ec2cbabf',
        type: 'uk.gov.fcp.sfd.notification.retry',
        time: new Date('2024-11-18T15:00:00.000Z'),
        data: {
          ...mockCommsRequest.data,
          correlationId: 'c5adb509-a25f-430e-a439-e22dc3e7e166',
          recipient: 'test@example.com'
        }
      })
    }))

    expect(sqsClient.send).toHaveBeenCalledTimes(1)

    cryptoSpy.mockRestore()
  })

  test('should wrap error on sqs failure', async () => {
    const mockError = new Error('test error')

    sqsClient.send.mockRejectedValue(mockError)

    await expect(publishRetryRequest(mockCommsRequest, 'test@example.com', 15)).resolves.toBeUndefined()
  })

  afterAll(() => {
    vi.useRealTimers()
  })
})
