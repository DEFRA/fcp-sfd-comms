export const messagingConfig = {
  messaging: {
    waitTimeSeconds: {
      doc: 'The duration (in seconds) for which the call will wait for a message to arrive in the queue before returning.',
      format: Number,
      default: 10,
      env: 'SQS_CONSUMER_WAIT_TIME_SECONDS'
    },
    batchSize: {
      doc: 'The maximum number of messages to return in each call',
      format: Number,
      default: 10,
      env: 'SQS_CONSUMER_BATCH_SIZE'
    },
    pollingWaitTime: {
      doc: 'The duration (in seconds) before sqs-consumer polls for new messages',
      format: Number,
      default: 0,
      env: 'SQS_CONSUMER_POLLING_WAIT_TIME'
    },
    commsRequest: {
      queueUrl: {
        doc: 'URL for the comms ingest queue',
        format: String,
        default: null,
        env: 'COMMS_REQUEST_QUEUE_URL'
      },
      deadLetterUrl: {
        doc: 'URL for the comms ingest dead letter queue',
        format: String,
        default: null,
        env: 'COMMS_REQUEST_DEAD_LETTER_QUEUE_URL'
      }
    },
    commEvents: {
      topicArn: {
        doc: 'ARN (Amazon Resource Name) for the comm events SNS topic to which comms events are published',
        format: String,
        default: null,
        env: 'COMM_EVENTS_TOPIC_ARN'
      }
    }
  }
}
