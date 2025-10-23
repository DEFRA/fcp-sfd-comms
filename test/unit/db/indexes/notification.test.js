import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockCollection = {}
const mockDbClient = {
  collection: vi.fn(() => mockCollection)
}

vi.mock('../../../../src/db/db-client.js', () => ({
  default: mockDbClient
}))

const mockCreateIndex = vi.fn()

vi.mock('../../../../src/db/create-index.js', () => ({
  createIndex: mockCreateIndex
}))

const { setupNotificationIndexes } = await import('../../../../src/db/indexes/notification.js')

describe('Set up notification indexes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should set up indexes on notificationRequests collection', async () => {
    await setupNotificationIndexes()

    expect(mockDbClient.collection).toHaveBeenCalledWith('notificationRequests')

    expect(mockCreateIndex).toHaveBeenNthCalledWith(
      1,
      mockCollection,
      {
        'message.id': 1
      },
      'message_id_index',
      true
    )

    expect(mockCreateIndex).toHaveBeenNthCalledWith(
      2,
      mockCollection,
      {
        'message.source': 1
      },
      'message_source_index'
    )

    expect(mockCreateIndex).toHaveBeenNthCalledWith(
      3,
      mockCollection,
      {
        'message.id': 1,
        'message.source': 1
      },
      'message_id_source_index',
      true
    )

    expect(mockCreateIndex).toHaveBeenCalledTimes(3)
  })
})
