import dbClient from '../db-client.js'
import { createIndex } from '../create-index.js'

const notificationRequestsCollection = dbClient.collection('notificationRequests')

export const setupNotificationIndexes = async () => {
  createIndex(notificationRequestsCollection, { 'message.id': 1 }, 'message_id_index')
  createIndex(notificationRequestsCollection, { 'message.source': 1 }, 'message_source_index')
}
