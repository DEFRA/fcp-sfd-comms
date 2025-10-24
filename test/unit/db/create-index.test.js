import { vi, describe, test, expect, beforeEach } from 'vitest'
import { createLogger } from '../../../src/logging/logger.js'

vi.mock('../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()
const { createIndex } = await import('../../../src/db/create-index.js')

describe('Create MongoDB index', () => {
  let mockCollection

  beforeEach(() => {
    vi.clearAllMocks()

    mockCollection = {
      createIndex: vi.fn()
    }
  })

  test('should create index successfully', async () => {
    mockCollection.createIndex.mockResolvedValueOnce('mockIndex')

    await createIndex(mockCollection, { field: 1 }, 'mockIndex', true)

    expect(mockCollection.createIndex).toHaveBeenCalledWith(
      { field: 1 },
      {
        unique: true,
        name: 'mockIndex'
      }
    )

    expect(mockLogger.info).toHaveBeenCalledWith('Index has been created: mockIndex')
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('should log error when index creation fails', async () => {
    const error = new Error('Index creation failed')
    mockCollection.createIndex.mockRejectedValueOnce(error)

    await createIndex(mockCollection, { field: 1 }, 'mockIndex')

    expect(mockCollection.createIndex).toHaveBeenCalledWith(
      { field: 1 },
      {
        unique: false,
        name: 'mockIndex'
      }
    )

    expect(mockLogger.error).toHaveBeenCalledWith(`Unable to create index mockIndex: ${error.message}`)
    expect(mockLogger.info).not.toHaveBeenCalled()
  })
})
