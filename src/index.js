import process from 'node:process'

import { createLogger } from './logging/logger.js'
import { startServer } from './api/common/helpers/start-server.js'
import { startMessaging, stopMessaging } from './messaging/inbound/inbound.js'
import { validate } from './config/index.js'

const logger = createLogger()

try {
  validate()
} catch (error) {
  logger.error(`Configuration error: ${error.message}`)
  throw error
}

const server = await startServer()

startMessaging()

server.events.on('stop', () => {
  stopMessaging()
})

process.on('unhandledRejection', (error) => {
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
