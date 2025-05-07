import semaphore from 'semaphore'
import { CronJob } from 'cron'

import { config } from '../config/index.js'

import { createLogger } from '../logging/logger.js'

import { checkNotifyStatusHandler } from './check-notify-status/handler.js'

const logger = createLogger()

const statusCheckMutex = semaphore(1)

const notifyStatusJob = new CronJob(
  config.get('jobs.checkNotifyStatus.cronPattern'),
  async () => {
    if (!statusCheckMutex.available(1)) {
      logger.warn('Check notify status job already running')
      return
    }

    statusCheckMutex.take(async () => {
      await checkNotifyStatusHandler()

      statusCheckMutex.leave()
    })
  }
)

const startJobs = () => {
  notifyStatusJob.start()
}

const stopJobs = () => {
  notifyStatusJob.stop()
}

export { startJobs, stopJobs }
