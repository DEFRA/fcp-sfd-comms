import { afterEach, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals'

const mockSnsClient = jest.fn()

jest.unstable_mockModule('@aws-sdk/client-sns', () => {
  return {
    SNSClient: mockSnsClient
  }
})

describe('SNS (Simple Notification Service) Client', () => {
  let originalEnv

  beforeAll(() => {
    originalEnv = process.env
  })

  beforeEach(async () => {
    jest.resetModules()
  })

  test('should create SNS client with access/secret key in development', async () => {
    process.env.NODE_ENV = 'development'

    const { snsClient } = await import('../../../../src/messaging/sns/client.js')

    expect(snsClient).toBeDefined()
    expect(mockSnsClient).toHaveBeenCalledWith({
      endpoint: 'http://localstack:4566',
      region: 'eu-west-2',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    })
  })

  test('should create SNS client without access/secret key in production', async () => {
    process.env.NODE_ENV = 'production'

    const { snsClient } = await import('../../../../src/messaging/sns/client.js')

    expect(snsClient).toBeDefined()
    expect(mockSnsClient).toHaveBeenCalledWith({
      endpoint: 'http://localstack:4566',
      region: 'eu-west-2'
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })
})
