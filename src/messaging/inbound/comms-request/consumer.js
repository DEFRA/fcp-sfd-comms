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
    handleMessageBatch: async (messages) => handleCommRequestMessages(sqsClient, messages),
    sqs: sqsClient
  })

  commsRequestConsumer.on('started', () => {
    logger.info('Data ingestion consumer started')
  })

  commsRequestConsumer.on('stopped', () => {
    logger.info('Data ingestion consumer stopped')
  })

  commsRequestConsumer.on('error', (err) => {
    logger.error(`Error during data ingestion message handling: ${err.message}`)
  })

  commsRequestConsumer.on('processing_error', (err) => {
    logger.error(`Error during data ingestion message processing: ${err.message}`)
  })

  commsRequestConsumer.on('timeout_error', (err) => {
    logger.error(`Timeout error during data ingestion message handling: ${err.message}`)
  })

  commsRequestConsumer.start()
}

const stopCommsListener = () => {
  commsRequestConsumer.stop()
}

export { startCommsListener, stopCommsListener }
