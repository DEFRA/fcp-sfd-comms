import { NotifyClient } from 'notifications-node-client'
import { config } from '../config/index.js'

const createNotifyClient = () => {
  return new NotifyClient(
    config.get('apiKey'),
    'random-service-id'
  )
}

const notifyClient = createNotifyClient()

export default notifyClient
