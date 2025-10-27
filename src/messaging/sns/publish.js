import { PublishCommand } from '@aws-sdk/client-sns'
import { debugLog } from '../../utils/debug-log.js'

const publish = async (snsClient, topicArn, message) => {
  const params = {
    TopicArn: topicArn,
    Message: JSON.stringify(message)
  }

  debugLog(message)
  
  const command = new PublishCommand(params)

  await snsClient.send(command)
}

export { publish }
