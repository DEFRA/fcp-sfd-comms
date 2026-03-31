import { beforeEach, describe, expect, vi, test } from 'vitest'

import { parseArgs, fetchByReference, formatRow, run, printResults } from '../../../scripts/check-notify-messages.js'

const mockNotification = (overrides = {}) => ({
  id: 'notify-id-1',
  reference: 'ref-1',
  email_address: 'test@example.com',
  status: 'delivered',
  created_at: '2026-03-24T13:42:38.000Z',
  template: { id: 'template-1', version: 1 },
  ...overrides
})

const mockNotifyClient = {
  getNotifications: vi.fn()
}

describe('check-notify-messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseArgs', () => {
    test('should parse references from argv', () => {
      const argv = ['node', 'script.js', '--references', 'ref-1', 'ref-2']
      const result = parseArgs(argv)

      expect(result).toEqual({
        references: ['ref-1', 'ref-2'],
        status: null
      })
    })

    test('should parse status and references', () => {
      const argv = ['node', 'script.js', '--references', 'ref-1', '--status', 'delivered']
      const result = parseArgs(argv)

      expect(result).toEqual({
        references: ['ref-1'],
        status: 'delivered'
      })
    })

    test('should parse status before references', () => {
      const argv = ['node', 'script.js', '--status', 'failed', '--references', 'ref-1', 'ref-2']
      const result = parseArgs(argv)

      expect(result).toEqual({
        references: ['ref-1', 'ref-2'],
        status: 'failed'
      })
    })

    test('should throw if --references is missing', () => {
      const argv = ['node', 'script.js', '--status', 'delivered']

      expect(() => parseArgs(argv)).toThrow('--references argument is required')
    })

    test('should throw if no references are provided after flag', () => {
      const argv = ['node', 'script.js', '--references', '--status', 'delivered']

      expect(() => parseArgs(argv)).toThrow('at least one reference must be provided')
    })

    test('should throw if --references is last arg with no values', () => {
      const argv = ['node', 'script.js', '--references']

      expect(() => parseArgs(argv)).toThrow('at least one reference must be provided')
    })
  })

  describe('fetchByReference', () => {
    test('should return notifications for a reference', async () => {
      const notifications = [mockNotification()]
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications }
      })

      const result = await fetchByReference(mockNotifyClient, 'ref-1', null)

      expect(result).toEqual(notifications)
      expect(mockNotifyClient.getNotifications).toHaveBeenCalledWith(
        'email', null, 'ref-1', null
      )
    })

    test('should pass status filter to notify client', async () => {
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications: [] }
      })

      await fetchByReference(mockNotifyClient, 'ref-1', 'delivered')

      expect(mockNotifyClient.getNotifications).toHaveBeenCalledWith(
        'email', 'delivered', 'ref-1', null
      )
    })

    test('should return empty array when no notifications found', async () => {
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications: [] }
      })

      const result = await fetchByReference(mockNotifyClient, 'ref-1', null)

      expect(result).toEqual([])
    })

    test('should paginate when 250 results are returned', async () => {
      const firstPage = Array.from({ length: 250 }, (_, i) =>
        mockNotification({ id: `id-${i}` })
      )
      const secondPage = [mockNotification({ id: 'id-250' })]

      mockNotifyClient.getNotifications
        .mockResolvedValueOnce({ data: { notifications: firstPage } })
        .mockResolvedValueOnce({ data: { notifications: secondPage } })

      const result = await fetchByReference(mockNotifyClient, 'ref-1', null)

      expect(result).toHaveLength(251)
      expect(mockNotifyClient.getNotifications).toHaveBeenCalledTimes(2)
      expect(mockNotifyClient.getNotifications).toHaveBeenNthCalledWith(
        2, 'email', null, 'ref-1', 'id-249'
      )
    })

    test('should stop paginating when fewer than 250 results returned', async () => {
      const notifications = Array.from({ length: 100 }, (_, i) =>
        mockNotification({ id: `id-${i}` })
      )

      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications }
      })

      const result = await fetchByReference(mockNotifyClient, 'ref-1', null)

      expect(result).toHaveLength(100)
      expect(mockNotifyClient.getNotifications).toHaveBeenCalledTimes(1)
    })
  })

  describe('formatRow', () => {
    test('should format notification as pipe-delimited row', () => {
      const result = formatRow(mockNotification())

      expect(result).toBe('ref-1 | notify-id-1 | delivered | 2026-03-24T13:42:38.000Z | template-1')
    })

    test('should show (none) when reference is null', () => {
      const result = formatRow(mockNotification({ reference: null }))

      expect(result).toContain('(none)')
    })
  })

  describe('run', () => {
    test('should return results for each reference', async () => {
      const notification = mockNotification()
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications: [notification] }
      })

      const results = await run(mockNotifyClient, ['ref-1'], null)

      expect(results).toEqual([
        { reference: 'ref-1', matches: [notification] }
      ])
    })

    test('should handle multiple references', async () => {
      const n1 = mockNotification({ id: 'id-1', reference: 'ref-1' })
      const n2 = mockNotification({ id: 'id-2', reference: 'ref-2' })

      mockNotifyClient.getNotifications
        .mockResolvedValueOnce({ data: { notifications: [n1] } })
        .mockResolvedValueOnce({ data: { notifications: [n2] } })

      const results = await run(mockNotifyClient, ['ref-1', 'ref-2'], null)

      expect(results).toHaveLength(2)
      expect(results[0].matches).toEqual([n1])
      expect(results[1].matches).toEqual([n2])
    })

    test('should capture API errors per reference without stopping', async () => {
      const notification = mockNotification()
      const apiError = new Error('API failure')
      apiError.response = {
        data: { errors: [{ message: 'Rate limit exceeded' }] }
      }

      mockNotifyClient.getNotifications
        .mockRejectedValueOnce(apiError)
        .mockResolvedValueOnce({ data: { notifications: [notification] } })

      const results = await run(mockNotifyClient, ['ref-bad', 'ref-good'], null)

      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({
        reference: 'ref-bad',
        matches: [],
        error: 'Rate limit exceeded'
      })
      expect(results[1].matches).toEqual([notification])
    })

    test('should use error.message when no response errors', async () => {
      mockNotifyClient.getNotifications.mockRejectedValue(
        new Error('Network timeout')
      )

      const results = await run(mockNotifyClient, ['ref-1'], null)

      expect(results[0].error).toBe('Network timeout')
    })
  })

  describe('printResults', () => {
    let logSpy

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    test('should print table header and notification rows', () => {
      const results = [{
        reference: 'ref-1',
        matches: [mockNotification()]
      }]

      printResults(results, ['ref-1'])

      expect(logSpy).toHaveBeenCalledWith(
        'reference | notify_id | status | created_at | template_id'
      )
      expect(logSpy).toHaveBeenCalledWith(
        'ref-1 | notify-id-1 | delivered | 2026-03-24T13:42:38.000Z | template-1'
      )
      expect(logSpy).toHaveBeenCalledWith(
        '\nSummary: 1 notification(s) found for 1 reference(s)'
      )
    })

    test('should print error for failed references', () => {
      const results = [{
        reference: 'ref-bad',
        matches: [],
        error: 'Rate limit exceeded'
      }]

      printResults(results, ['ref-bad'])

      expect(logSpy).toHaveBeenCalledWith('ref-bad | ERROR: Rate limit exceeded')
    })

    test('should list references with no results', () => {
      const results = [{
        reference: 'ref-missing',
        matches: []
      }]

      printResults(results, ['ref-missing'])

      expect(logSpy).toHaveBeenCalledWith(
        '\nNo results for 1 reference(s):'
      )
      expect(logSpy).toHaveBeenCalledWith('  ref-missing')
    })

    test('should not print "no results" section when all references have matches', () => {
      const results = [{
        reference: 'ref-1',
        matches: [mockNotification()]
      }]

      printResults(results, ['ref-1'])

      const calls = logSpy.mock.calls.map((c) => c[0])
      expect(calls).not.toContain(expect.stringContaining('No results for'))
    })
  })
})
