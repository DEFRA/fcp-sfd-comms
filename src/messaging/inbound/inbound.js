import { sqsClient } from '../sqs/client.js'
import { startCommsListener, stopCommsListener } from './comms-request/consumer.js'

const startMessaging = () => {
  startCommsListener(sqsClient)
}

const stopMessaging = () => {
  stopCommsListener()
}

export { startMessaging, stopMessaging }
