import { Consumer } from 'sqs-consumer'

import { createLogger } from '../../../logging/logger.js'
import { config } from '../../../config/index.js'
import { handleCommRequestMessages } from './handler.js'

const logger = createLogger()

let commsRequestConsumer

const startCommsListener = (sqsClient) => {
  commsRequestConsumer = Consumer.create({
    queueUrl: config.get('messaging.commsRequest.queueUrl'),
    batchSize: config.get('messaging.batchSize'),
    visibilityTimeout: config.get('messaging.visibilityTimeout'),
    heartbeatInterval: config.get('messaging.heartbeatInterval'),
    waitTimeSeconds: config.get('messaging.waitTimeSeconds'),
    pollingWaitTime: config.get('messaging.pollingWaitTime'),
    handleMessageBatch: async (messages) => handleCommRequestMessages(messages),
    sqs: sqsClient
  })

  commsRequestConsumer.on('started', () => {
    logger.info('Comms request consumer started')
  })

  commsRequestConsumer.on('stopped', () => {
    logger.info('Comms request consumer stopped')
  })

  commsRequestConsumer.on('error', (err) => {
    logger.error(`Error during comms request message handling: ${err.message}`)
  })

  commsRequestConsumer.on('processing_error', (err) => {
    logger.error(`Error during comms request message processing: ${err.message}`)
  })

  commsRequestConsumer.on('timeout_error', (err) => {
    logger.error(`Timeout error during comms request message handling: ${err.message}`)
  })

  commsRequestConsumer.start()
}

const stopCommsListener = () => {
  commsRequestConsumer.stop()
}

export { startCommsListener, stopCommsListener }
