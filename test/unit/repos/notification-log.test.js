import { jest, describe, test, expect, beforeEach } from '@jest/globals'

const mockInsertOne = jest.fn()
const mockFindOne = jest.fn()
const mockUpdateOne = jest.fn()

jest.unstable_mockModule('../../../src/db/db-client.js', () => ({
  default: {
    collection: () => ({
      insertOne: mockInsertOne,
      findOne: mockFindOne,
      updateOne: mockUpdateOne
    })
  }
}))

const {
  addNotificationRequest,
  checkNotificationIdempotency,
  updateNotificationStatus
} = await import('../../../src/repos/notification-log.js')

describe('notification log repository', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('add notification request should wrap error', async () => {
    const mockError = new Error('test error')

    mockInsertOne.mockRejectedValue(mockError)

    await expect(addNotificationRequest({})).rejects.toMatchObject({
      message: 'Error logging notification request: test error',
      cause: mockError
    })
  })

  test('check notification idempotency should wrap error', async () => {
    const mockError = new Error('test error')

    mockFindOne.mockRejectedValue(mockError)

    await expect(checkNotificationIdempotency({})).rejects.toMatchObject({
      message: 'Error checking idempotency token: test error',
      cause: mockError
    })
  })

  test('update notification status should wrap error', async () => {
    const mockError = new Error('test error')

    mockUpdateOne.mockRejectedValue(mockError)

    await expect(updateNotificationStatus({}, 'recipient@example.com', 'delivered')).rejects.toMatchObject({
      message: expect.stringContaining('Error updating notification status'),
      cause: mockError
    })
  })
})
