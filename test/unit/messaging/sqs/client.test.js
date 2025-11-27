import { afterEach, beforeAll, beforeEach, describe, expect, vi, test } from 'vitest'

const mockSqsClient = vi.fn()

vi.mock('@aws-sdk/client-sqs', () => {
  return {
    SQSClient: mockSqsClient
  }
})

const snsEndpoint = process.env.SQS_ENDPOINT

describe('sqs client', () => {
  let originalEnv

  beforeAll(() => {
    originalEnv = process.env
  })

  beforeEach(async () => {
    vi.resetModules()
  })

  test('should create sqs client using access / secret key in development', async () => {
    process.env.NODE_ENV = 'development'

    const { sqsClient } = await import('../../../../src/messaging/sqs/client.js')

    expect(sqsClient).toBeDefined()
    expect(mockSqsClient).toHaveBeenCalledWith({
      endpoint: snsEndpoint,
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
      endpoint: snsEndpoint,
      region: 'eu-west-2'
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })
})
