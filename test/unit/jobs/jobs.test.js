import { beforeEach, describe, expect, test, vi } from 'vitest'

import { CronJob } from 'cron'

import { checkNotifyStatusHandler } from '../../../src/jobs/check-notify-status/handler.js'

const {
  availableMock,
  takeMock,
  leaveMock,
  mockStartJob,
  mockStopJob
} = vi.hoisted(() => ({
  availableMock: vi.fn(),
  takeMock: vi.fn((fn) => fn()),
  leaveMock: vi.fn(),
  mockStartJob: vi.fn(),
  mockStopJob: vi.fn()
}))

vi.mock('semaphore', () => ({
  default: vi.fn(() => ({
    available: availableMock,
    take: takeMock,
    leave: leaveMock
  }))
}))

vi.mock('cron', () => ({
  CronJob: vi.fn(function () {
    this.start = mockStartJob
    this.stop = mockStopJob
  })
}))

vi.mock('../../../src/config/index.js', () => ({
  config: {
    get: (key) => {
      const values = {
        'jobs.checkNotifyStatus.cronPattern': '*/30 * * * * *'
      }
      return values[key]
    }
  }
}))

vi.mock('../../../src/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../../../src/jobs/check-notify-status/handler.js', () => ({
  checkNotifyStatusHandler: vi.fn()
}))

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
