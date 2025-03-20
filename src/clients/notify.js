import { NotifyClient } from 'notifications-node-client'
import { config } from '../config/index.js'

const createNotifyClient = () => {
  if (!config.get('mockApi.useMock')) {
    return new NotifyClient(config.get('apiKey'))
  }

  return new NotifyClient(
    config.get('mockApi.endpoint'),
    config.get('apiKey'),
    'random-service-id'
  )
}

const notifyClient = createNotifyClient()

export default notifyClient
