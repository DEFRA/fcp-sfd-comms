import { jest, describe, test, expect, beforeEach } from '@jest/globals'

import v3CommsRequest from '../../../../../mocks/comms-request/v3.js'

import { UnprocessableMessageError } from '../../../../../../src/errors/message-errors.js'

const mockLoggerInfo = jest.fn()
const mockLoggerError = jest.fn()

jest.unstable_mockModule('../../../../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

const { processV3CommsRequest } = await import('../../../../../../src/messaging/inbound/comms-request/processors/v3.js')

describe('comms request v3 processor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should process a valid comms message', async () => {
    await processV3CommsRequest(v3CommsRequest)

    expect(mockLoggerInfo).toHaveBeenCalledWith('Comms V3 request processed successfully, eventId: 79389915-7275-457a-b8ca-8bf206b2e67b')
  })

  test('should throw UNPROCESSABLE_MESSAGE error for invalid message', async () => {
    await expect(processV3CommsRequest({})).rejects.toThrow(UnprocessableMessageError)

    expect(mockLoggerError).toHaveBeenCalledWith(
      'Invalid comms V3 payload: "id" is required,"source" is required,"specversion" is required,"type" is required,"datacontenttype" is required,"time" is required,"data" is required'
    )
  })
})
