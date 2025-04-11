import { afterEach, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals'

const mockSqsClient = jest.fn()

jest.unstable_mockModule('@aws-sdk/client-sqs', () => {
  return {
    SQSClient: mockSqsClient
  }
})

describe('sqs client', () => {
  let originalEnv

  beforeAll(() => {
    originalEnv = process.env
  })

  beforeEach(async () => {
    jest.resetModules()
  })

  test('should create sqs client using access / secret key in development', async () => {
    process.env.NODE_ENV = 'development'

    const { sqsClient } = await import('../../../../src/messaging/sqs/client.js')

    expect(sqsClient).toBeDefined()
    expect(mockSqsClient).toHaveBeenCalledWith({
      endpoint: 'http://localstack:4566',
      region: 'eu-west-2',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    })
  })

  test('should create sqs client without access / secret key in production', async () => {
    process.env.NODE_ENV = 'production'

    const { sqsClient } = await import('../../../../src/messaging/sqs/client.js')

    expect(sqsClient).toBeDefined()
    expect(mockSqsClient).toHaveBeenCalledWith({
      endpoint: 'http://localstack:4566',
      region: 'eu-west-2'
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })
})
