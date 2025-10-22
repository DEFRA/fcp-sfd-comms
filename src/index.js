import process from 'node:process'

import { createLogger } from './logging/logger.js'
import { startServer } from './api/common/helpers/start-server.js'
import { setupNotificationIndexes } from './db/indexes/notification.js'
import { startMessaging, stopMessaging } from './messaging/inbound/inbound.js'
import { startJobs, stopJobs } from './jobs/jobs.js'

const server = await startServer()

await setupNotificationIndexes()
startMessaging()
startJobs()

server.events.on('stop', () => {
  stopMessaging()
  stopJobs()
})

process.on('unhandledRejection', (error) => {
  const logger = createLogger()
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
