// import { sqsClient } from '../sqs/client.js'
// import { startCommsListener, stopCommsListener } from './comms-request/consumer.js'

import { createLogger } from '../../logging/logger.js'

const logger = createLogger()

const startMessaging = () => {
  logger.info('Starting messaging')
  // startCommsListener(sqsClient)
}

const stopMessaging = () => {
  // stopCommsListener()
}

export { startMessaging, stopMessaging }
