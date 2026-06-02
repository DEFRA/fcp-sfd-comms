import { beforeEach, describe, expect, vi, test } from 'vitest'

import { parseArgs, fetchNotifications, formatRow, printResults } from '../../../scripts/notify-find-by-date.js'

const mockNotification = (overrides = {}) => ({
  id: 'notify-id-1',
  reference: 'ref-1',
  type: 'email',
  status: 'delivered',
  created_at: '2026-05-15T10:30:00.000Z',
  template: { id: 'template-1', version: 1 },
  ...overrides
})

const mockNotifyClient = {
  getNotifications: vi.fn()
}

describe('notify-find-by-date', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseArgs', () => {
    test('should parse --from date', () => {
      const argv = ['node', 'script.js', '--from', '2026-05-01']
      const result = parseArgs(argv)

      expect(result.fromDate).toEqual(new Date('2026-05-01'))
      expect(result.toDate).toBeNull()
      expect(result.status).toBeNull()
      expect(result.type).toBeNull()
      expect(result.reference).toBeNull()
      expect(result.templateId).toBeNull()
    })

    test('should parse --from and --to dates', () => {
      const argv = ['node', 'script.js', '--from', '2026-05-01', '--to', '2026-05-31']
      const result = parseArgs(argv)

      expect(result.fromDate).toEqual(new Date('2026-05-01'))
      expect(result.toDate.getFullYear()).toBe(2026)
      expect(result.toDate.getMonth()).toBe(4)
      expect(result.toDate.getDate()).toBe(31)
      expect(result.toDate.getHours()).toBe(23)
      expect(result.toDate.getMinutes()).toBe(59)
    })

    test('should parse all optional filters', () => {
      const argv = [
        'node', 'script.js',
        '--from', '2026-05-01',
        '--status', 'delivered',
        '--type', 'email',
        '--reference', 'my-ref',
        '--template-id', 'abc-123'
      ]
      const result = parseArgs(argv)

      expect(result.status).toBe('delivered')
      expect(result.type).toBe('email')
      expect(result.reference).toBe('my-ref')
      expect(result.templateId).toBe('abc-123')
    })

    test('should throw if --from is missing', () => {
      const argv = ['node', 'script.js', '--to', '2026-05-31']

      expect(() => parseArgs(argv)).toThrow('--from argument is required (YYYY-MM-DD)')
    })

    test('should throw if --from date is invalid', () => {
      const argv = ['node', 'script.js', '--from', 'not-a-date']

      expect(() => parseArgs(argv)).toThrow('Invalid --from date: not-a-date')
    })

    test('should throw if --to date is invalid', () => {
      const argv = ['node', 'script.js', '--from', '2026-05-01', '--to', 'bad']

      expect(() => parseArgs(argv)).toThrow('Invalid --to date: bad')
    })

    test('should throw if --type is not a valid value', () => {
      const argv = ['node', 'script.js', '--from', '2026-05-01', '--type', 'fax']

      expect(() => parseArgs(argv)).toThrow('--type must be one of: email, sms, letter')
    })

    test('should accept sms as a valid type', () => {
      const argv = ['node', 'script.js', '--from', '2026-05-01', '--type', 'sms']
      const result = parseArgs(argv)

      expect(result.type).toBe('sms')
    })

    test('should accept letter as a valid type', () => {
      const argv = ['node', 'script.js', '--from', '2026-05-01', '--type', 'letter']
      const result = parseArgs(argv)

      expect(result.type).toBe('letter')
    })
  })

  describe('fetchNotifications', () => {
    const defaultFilters = {
      fromDate: new Date('2026-05-01'),
      toDate: new Date('2026-05-31T23:59:59.999Z'),
      status: null,
      type: null,
      reference: null,
      templateId: null
    }

    test('should return notifications within date range', async () => {
      const notifications = [
        mockNotification({ created_at: '2026-05-15T10:00:00.000Z' })
      ]
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications }
      })

      const result = await fetchNotifications(mockNotifyClient, defaultFilters)

      expect(result).toEqual(notifications)
      expect(mockNotifyClient.getNotifications).toHaveBeenCalledWith(
        null, null, null, null
      )
    })

    test('should pass type, status, and reference to API', async () => {
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications: [] }
      })

      await fetchNotifications(mockNotifyClient, {
        ...defaultFilters,
        type: 'email',
        status: 'delivered',
        reference: 'my-ref'
      })

      expect(mockNotifyClient.getNotifications).toHaveBeenCalledWith(
        'email', 'delivered', 'my-ref', null
      )
    })

    test('should exclude notifications before --from date', async () => {
      const notifications = [
        mockNotification({ id: 'id-1', created_at: '2026-05-15T10:00:00.000Z' }),
        mockNotification({ id: 'id-2', created_at: '2026-04-20T10:00:00.000Z' })
      ]
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications }
      })

      const result = await fetchNotifications(mockNotifyClient, defaultFilters)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('id-1')
    })

    test('should exclude notifications after --to date', async () => {
      const notifications = [
        mockNotification({ id: 'id-1', created_at: '2026-06-15T10:00:00.000Z' }),
        mockNotification({ id: 'id-2', created_at: '2026-05-15T10:00:00.000Z' })
      ]
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications }
      })

      const result = await fetchNotifications(mockNotifyClient, defaultFilters)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('id-2')
    })

    test('should stop paginating when reaching notifications before date range', async () => {
      const page1 = [
        mockNotification({ id: 'id-1', created_at: '2026-05-15T10:00:00.000Z' }),
        mockNotification({ id: 'id-2', created_at: '2026-04-01T10:00:00.000Z' })
      ]
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications: page1 }
      })

      const result = await fetchNotifications(mockNotifyClient, defaultFilters)

      expect(result).toHaveLength(1)
      expect(mockNotifyClient.getNotifications).toHaveBeenCalledTimes(1)
    })

    test('should paginate when 250 results returned and not reached start date', async () => {
      const page1 = Array.from({ length: 250 }, (_, i) =>
        mockNotification({ id: `id-${i}`, created_at: '2026-05-20T10:00:00.000Z' })
      )
      const page2 = [
        mockNotification({ id: 'id-250', created_at: '2026-05-10T10:00:00.000Z' })
      ]

      mockNotifyClient.getNotifications
        .mockResolvedValueOnce({ data: { notifications: page1 } })
        .mockResolvedValueOnce({ data: { notifications: page2 } })

      const result = await fetchNotifications(mockNotifyClient, defaultFilters)

      expect(result).toHaveLength(251)
      expect(mockNotifyClient.getNotifications).toHaveBeenCalledTimes(2)
      expect(mockNotifyClient.getNotifications).toHaveBeenNthCalledWith(
        2, null, null, null, 'id-249'
      )
    })

    test('should stop paginating when fewer than 250 results returned', async () => {
      const notifications = Array.from({ length: 50 }, (_, i) =>
        mockNotification({ id: `id-${i}`, created_at: '2026-05-15T10:00:00.000Z' })
      )
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications }
      })

      const result = await fetchNotifications(mockNotifyClient, defaultFilters)

      expect(result).toHaveLength(50)
      expect(mockNotifyClient.getNotifications).toHaveBeenCalledTimes(1)
    })

    test('should return empty array when no notifications found', async () => {
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications: [] }
      })

      const result = await fetchNotifications(mockNotifyClient, defaultFilters)

      expect(result).toEqual([])
    })

    test('should filter by template ID client-side', async () => {
      const notifications = [
        mockNotification({ id: 'id-1', template: { id: 'template-a', version: 1 } }),
        mockNotification({ id: 'id-2', template: { id: 'template-b', version: 1 } }),
        mockNotification({ id: 'id-3', template: { id: 'template-a', version: 2 } })
      ]
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications }
      })

      const result = await fetchNotifications(mockNotifyClient, {
        ...defaultFilters,
        templateId: 'template-a'
      })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('id-1')
      expect(result[1].id).toBe('id-3')
    })

    test('should include all notifications when no template ID filter', async () => {
      const notifications = [
        mockNotification({ id: 'id-1', template: { id: 'template-a', version: 1 } }),
        mockNotification({ id: 'id-2', template: { id: 'template-b', version: 1 } })
      ]
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications }
      })

      const result = await fetchNotifications(mockNotifyClient, defaultFilters)

      expect(result).toHaveLength(2)
    })

    test('should include notifications without --to date when after --from', async () => {
      const notifications = [
        mockNotification({ id: 'id-1', created_at: '2026-06-15T10:00:00.000Z' }),
        mockNotification({ id: 'id-2', created_at: '2026-05-15T10:00:00.000Z' })
      ]
      mockNotifyClient.getNotifications.mockResolvedValue({
        data: { notifications }
      })

      const result = await fetchNotifications(mockNotifyClient, {
        ...defaultFilters,
        toDate: null
      })

      expect(result).toHaveLength(2)
    })
  })

  describe('formatRow', () => {
    test('should format notification as pipe-delimited row', () => {
      const result = formatRow(mockNotification())

      expect(result).toBe(
        '2026-05-15T10:30:00.000Z | notify-id-1 | email | delivered | template-1 | ref-1'
      )
    })

    test('should show (none) when reference is null', () => {
      const result = formatRow(mockNotification({ reference: null }))

      expect(result).toContain('(none)')
    })

    test('should include type in output', () => {
      const result = formatRow(mockNotification({ type: 'sms' }))

      expect(result).toContain('sms')
    })
  })

  describe('printResults', () => {
    let logSpy

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    test('should print table header and notification rows', () => {
      const notifications = [mockNotification()]
      const filters = {
        fromDate: new Date('2026-05-01'),
        toDate: null,
        status: null,
        type: null,
        reference: null,
        templateId: null
      }

      printResults(notifications, filters)

      expect(logSpy).toHaveBeenCalledWith(
        'created_at | notify_id | type | status | template_id | reference'
      )
      expect(logSpy).toHaveBeenCalledWith(
        '2026-05-15T10:30:00.000Z | notify-id-1 | email | delivered | template-1 | ref-1'
      )
    })

    test('should print total count', () => {
      const notifications = [mockNotification(), mockNotification({ id: 'id-2' })]
      const filters = { fromDate: new Date('2026-05-01'), toDate: null, status: null, type: null, reference: null, templateId: null }

      printResults(notifications, filters)

      expect(logSpy).toHaveBeenCalledWith('\nTotal: 2 notification(s) found')
    })

    test('should print applied filters', () => {
      const filters = {
        fromDate: new Date('2026-05-01'),
        toDate: new Date('2026-05-31T23:59:59.999Z'),
        status: 'delivered',
        type: 'email',
        reference: 'my-ref',
        templateId: 'template-abc'
      }

      printResults([], filters)

      expect(logSpy).toHaveBeenCalledWith('\nFilters applied:')
      expect(logSpy).toHaveBeenCalledWith('  From: 2026-05-01')
      expect(logSpy).toHaveBeenCalledWith('  To: 2026-05-31')
      expect(logSpy).toHaveBeenCalledWith('  Status: delivered')
      expect(logSpy).toHaveBeenCalledWith('  Type: email')
      expect(logSpy).toHaveBeenCalledWith('  Reference: my-ref')
      expect(logSpy).toHaveBeenCalledWith('  Template ID: template-abc')
    })

    test('should not print optional filters when not set', () => {
      const filters = {
        fromDate: new Date('2026-05-01'),
        toDate: null,
        status: null,
        type: null,
        reference: null,
        templateId: null
      }

      printResults([], filters)

      const calls = logSpy.mock.calls.map((c) => c[0])
      expect(calls).not.toContain(expect.stringContaining('Status:'))
      expect(calls).not.toContain(expect.stringContaining('Type:'))
      expect(calls).not.toContain(expect.stringContaining('Reference:'))
      expect(calls).not.toContain(expect.stringContaining('Template ID:'))
    })

    test('should print zero count when no notifications found', () => {
      const filters = { fromDate: new Date('2026-05-01'), toDate: null, status: null, type: null, reference: null, templateId: null }

      printResults([], filters)

      expect(logSpy).toHaveBeenCalledWith('\nTotal: 0 notification(s) found')
    })
  })
})
