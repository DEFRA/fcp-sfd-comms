import { beforeEach, describe, expect, test, vi } from 'vitest'

import { CronJob } from 'cron'

import { createLogger } from '../../../src/logging/logger.js'
import { checkNotifyStatusHandler } from '../../../src/jobs/check-notify-status/handler.js'

const availableMock = vi.fn()
const takeMock = vi.fn((fn) => fn())
const leaveMock = vi.fn()

vi.mock('semaphore', () => ({
  default: vi.fn(() => ({
    available: availableMock,
    take: takeMock,
    leave: leaveMock
  }))
}))

const mockStartJob = vi.fn()
const mockStopJob = vi.fn()

vi.mock('cron', () => ({
  CronJob: vi.fn(() => ({
    start: mockStartJob,
    stop: mockStopJob
  }))
}))

vi.mock('../../../src/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

const mockLogger = createLogger()

vi.mock('../../../src/jobs/check-notify-status/handler.js')

describe('cron job setup', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('check notify status cron job should be created', async () => {
    availableMock.mockReturnValue(true)

    await import('../../../src/jobs/jobs.js')

    expect(CronJob).toHaveBeenCalled('*/30 * * * * *', checkNotifyStatusHandler)
  })

  test('startJobs should start cron jobs', async () => {
    const { startJobs } = await import('../../../src/jobs/jobs.js')

    startJobs()

    expect(mockStartJob).toHaveBeenCalledTimes(1)
  })

  test('stopJobs should stop cron jobs', async () => {
    const { stopJobs } = await import('../../../src/jobs/jobs.js')

    stopJobs()

    expect(mockStopJob).toHaveBeenCalledTimes(1)
  })

  test('mutex should prevent concurrent check notify status jobs', async () => {
    availableMock.mockReturnValue(false)

    await import('../../../src/jobs/jobs.js')

    await CronJob.mock.calls[0][1]()

    expect(checkNotifyStatusHandler).not.toHaveBeenCalled()
  })

  test('mutex should release after check notify status job completes', async () => {
    availableMock.mockReturnValue(true)

    await import('../../../src/jobs/jobs.js')

    await CronJob.mock.calls[0][1]()

    expect(leaveMock).toHaveBeenCalledTimes(1)
  })
})
