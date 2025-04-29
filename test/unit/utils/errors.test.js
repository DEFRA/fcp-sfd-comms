import { afterAll, beforeAll, describe, expect, vi, test } from 'vitest'

import { checkRetryable } from '../../../src/utils/errors.js'

describe('error utils', () => {
  beforeAll(() => {
    vi.useFakeTimers()
  })

  describe('check retry window', () => {
    test('technical failure should return true', () => {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

      const retry = checkRetryable('technical-failure', new Date('2025-01-01T11:00:00.000Z'))

      expect(retry).toBe(true)
    })

    test.each(
      [
        '2025-01-01T11:00:00.000Z',
        '2025-01-08T10:44:59.000Z'
      ]
    )('should schedule retry on temporary-failure within retry window (%s)', (time) => {
      vi.setSystemTime(new Date(time))

      const retry = checkRetryable('temporary-failure', new Date('2025-01-01T11:00:00.000Z'))

      expect(retry).toBe(true)
    })

    test.each(
      [
        '2025-01-08T10:45:00.000Z',
        '2025-01-08T11:00:00.000Z'
      ]
    )('should not schedule retry on temporary-failure outside retry window (%s)', (time) => {
      vi.setSystemTime(new Date(time))

      const retry = checkRetryable('temporary-failure', new Date('2025-01-01T11:00:00.000Z'))

      expect(retry).toBe(false)
    })
  })

  afterAll(() => {
    vi.useRealTimers()
  })
})
