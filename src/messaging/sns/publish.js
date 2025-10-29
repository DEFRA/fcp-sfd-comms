import { PublishCommand } from '@aws-sdk/client-sns'
import { debugLog } from '../../utils/debug-log.js'

const publish = async (snsClient, topicArn, message) => {
  const params = {
    TopicArn: topicArn,
    Message: JSON.stringify(message)
  }

  
  debugLog(message) 
  // this uses logger.debug which will only execute when cdp-app-config value LOG_LEVEL is set to debug
  // any messages sent to the debugLog function are sanitised to remove any sensitive data

  const command = new PublishCommand(params)

  await snsClient.send(command)
}

export { publish }
