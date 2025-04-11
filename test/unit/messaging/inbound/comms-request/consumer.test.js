import { vi, describe, test, expect, beforeEach, afterAll } from 'vitest'

import * as sqsConsumer from 'sqs-consumer'
import { startCommsListener, stopCommsListener } from '../../../../../src/messaging/inbound/comms-request/consumer.js'

import { createLogger } from '../../../../../src/logging/logger.js'

vi.mock('../../../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn()
  })
}))

let mockConsumer

const consumerSpy = vi.spyOn(sqsConsumer.Consumer, 'create').mockImplementation((config) => {
  mockConsumer = new sqsConsumer.Consumer(config)

  mockConsumer.start = vi.fn()
  mockConsumer.stop = vi.fn()

  return mockConsumer
})

const mockLogger = createLogger()

describe('comms request sqs consumer', () => {
  test('should start the consumer', () => {
    startCommsListener({})

    expect(mockConsumer.start).toHaveBeenCalled()
  })

  test('should stop the consumer', () => {
    stopCommsListener({})

    expect(mockConsumer.stop).toHaveBeenCalled()
  })

  describe('event listeners', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    test('should log consumer start', () => {
      mockConsumer.emit('started')

      expect(mockLogger.info).toHaveBeenCalledWith('Comms request consumer started')
    })

    test('should log consumer stop', () => {
      mockConsumer.emit('stopped')

      expect(mockLogger.info).toHaveBeenCalledWith('Comms request consumer stopped')
    })

    test('should log consumer error', () => {
      mockConsumer.emit('error', new Error('Consumer error'))

      expect(mockLogger.error).toHaveBeenCalledWith('Error during comms request message handling: Consumer error')
    })

    test('should log consumer processing_error', () => {
      mockConsumer.emit('processing_error', new Error('Consumer error'))

      expect(mockLogger.error).toHaveBeenCalledWith('Error during comms request message processing: Consumer error')
    })

    test('should log consumer timeout_error', () => {
      mockConsumer.emit('timeout_error', new Error('Consumer error'))

      expect(mockLogger.error).toHaveBeenCalledWith('Timeout error during comms request message handling: Consumer error')
    })
  })

  afterAll(() => {
    consumerSpy.mockRestore()
  })
})
