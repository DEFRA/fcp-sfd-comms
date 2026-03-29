import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockGetTraceId = vi.fn()
const mockGetCorrelationId = vi.fn()

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: (...args) => mockGetTraceId(...args)
}))

vi.mock('../../../src/logging/correlation-id-store.js', () => ({
  getCorrelationId: (...args) => mockGetCorrelationId(...args)
}))

vi.mock('../../../src/config/index.js', () => ({
  config: {
    get: (key) => {
      const values = {
        log: {
          enabled: true,
          level: 'info',
          format: 'pino-pretty',
          redact: []
        },
        serviceName: 'fcp-sfd-comms',
        serviceVersion: '1.0.0'
      }
      return values[key]
    }
  }
}))

const { loggerOptions } = await import('../../../src/logging/logger-options.js')

describe('logger-options mixin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should include transaction.id as a flat key when async context is active', () => {
    mockGetCorrelationId.mockReturnValue('15df79e7-806e-4c85-9372-a2e256a1d597')

    const result = loggerOptions.mixin()

    expect(result['transaction.id']).toBe('15df79e7-806e-4c85-9372-a2e256a1d597')
  })

  test('should omit transaction.id when no async context is active', () => {
    mockGetCorrelationId.mockReturnValue(undefined)

    const result = loggerOptions.mixin()

    expect(result).not.toHaveProperty('transaction.id')
  })

  test('should include trace.id as a flat key when traceId is present', () => {
    mockGetTraceId.mockReturnValue('abc-123-trace')

    const result = loggerOptions.mixin()

    expect(result['trace.id']).toBe('abc-123-trace')
  })

  test('should omit trace.id when traceId is not present', () => {
    mockGetTraceId.mockReturnValue(undefined)

    const result = loggerOptions.mixin()

    expect(result).not.toHaveProperty('trace.id')
  })

  test('should include both trace.id and transaction.id as flat keys when both are present', () => {
    mockGetTraceId.mockReturnValue('abc-123-trace')
    mockGetCorrelationId.mockReturnValue('15df79e7-806e-4c85-9372-a2e256a1d597')

    const result = loggerOptions.mixin()

    expect(result).toEqual({
      'trace.id': 'abc-123-trace',
      'transaction.id': '15df79e7-806e-4c85-9372-a2e256a1d597'
    })
  })

  test('should return empty object when neither traceId nor correlationId is present', () => {
    mockGetTraceId.mockReturnValue(undefined)
    mockGetCorrelationId.mockReturnValue(undefined)

    const result = loggerOptions.mixin()

    expect(result).toEqual({})
  })
})
