import { afterAll, expect, describe, beforeEach, jest, test } from '@jest/globals'

const mockNotifyClient = jest.fn()

jest.mock('notifications-node-client', () => ({
  NotifyClient: mockNotifyClient
}))

describe('Notify client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.NOTIFY_API_KEY = 'test'

    jest.resetModules()
    jest.clearAllMocks()
  })

  test('should create a new Notify client', async () => {
    await import('../../../src/notify/notify-client.js')

    expect(mockNotifyClient).toHaveBeenCalledTimes(1)
    expect(mockNotifyClient).toHaveBeenCalledWith('test')
  })

  afterAll(() => {
    jest.clearAllMocks()
    process.env = originalEnv
  })
})
