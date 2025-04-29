import { CronJob } from 'cron'
import semaphore from 'semaphore'

import { config } from '../config/index.js'

import { createLogger } from '../logging/logger.js'
import { checkNotifyStatusHandler } from '../services/notify-service/check-notification-status.js'

const logger = createLogger()

const statusCheckMutex = semaphore(1)

export const notifyStatusJob = new CronJob(
  config.get('jobs.checkNotifyStatus.cronPattern'),
  async () => {
    if (!statusCheckMutex.available(1)) {
      logger.info('Check notify status job already running')
      return
    }

    statusCheckMutex.take(async () => {
      try {
        await checkNotifyStatusHandler()
      } catch (error) {
        logger.error(`Error running check notify status job: ${error.message}`)
      } finally {
        statusCheckMutex.leave()
      }
    })
  }
)
