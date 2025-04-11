import { afterAll, expect, describe, beforeEach, vi, test } from 'vitest'

const mockNotifyClient = vi.fn()

vi.mock('notifications-node-client', () => ({
  NotifyClient: mockNotifyClient
}))

describe('Notify client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.NOTIFY_API_KEY = 'test'

    vi.resetModules()
    vi.clearAllMocks()
  })

  test('should create a new Notify client', async () => {
    await import('../../../src/notify/notify-client.js')

    expect(mockNotifyClient).toHaveBeenCalledTimes(1)
    expect(mockNotifyClient).toHaveBeenCalledWith('test')
  })

  afterAll(() => {
    vi.clearAllMocks()
    process.env = originalEnv
  })
})
