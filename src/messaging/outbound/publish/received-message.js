import { config } from '../../../config/index.js'
import { snsClient } from '../sns/client.js'
import { publish } from '../sns/publish.js'
import { buildReceivedMessage } from '../build/received-message.js'
import { commsEvents } from '../../../constants/comms-events.js'

const snsTopic = config.get('messaging.dataAccessLayer.topicArn')

const publishReceivedMessage = async (message) => {
  const type = message.type !== commsEvents.RETRY
    ? commsEvents.RECEIVED
    : commsEvents.RETRY

  const receivedMessage = buildReceivedMessage(message, type)

  try {
    await publish(snsClient, snsTopic, receivedMessage)
  } catch (err) {
    console.error('Error publishing received message to SNS:', { cause: err })
  }
}

export { publishReceivedMessage }
