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
      try {
        logger.info('Running check notify status job')
        await checkNotifyStatusHandler()
      } catch (error) {
        logger.error('Error running check notify status job:', error.message)
      } finally {
        statusCheckMutex.leave()
      }
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
