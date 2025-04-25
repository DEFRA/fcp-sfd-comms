import { createLogger } from '../logging/logger.js'
import { notifyStatusJob } from './notify-jobs.js'

const logger = createLogger()

const startJobs = () => {
  logger.info('Starting notification status check job')
  notifyStatusJob.start()
}

const stopJobs = () => {
  logger.info('Stopping notification status check job')
  notifyStatusJob.stop()
}

export { startJobs, stopJobs }
